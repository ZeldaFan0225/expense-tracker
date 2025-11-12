"use client"

import * as React from "react"
import {createPortal} from "react-dom"
import {X} from "lucide-react"
import {cn} from "@/lib/utils"

type ToastVariant = "default" | "success" | "destructive"

type ToastInput = {
    title: string
    description?: string
    variant?: ToastVariant
    duration?: number
}

type ToastRecord = ToastInput & {
    id: string
}

type ToastContextValue = {
    showToast: (toast: ToastInput) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({children}: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastRecord[]>([])
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const showToast = React.useCallback(
        ({duration = 4000, ...toast}: ToastInput) => {
            const id =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
            const record: ToastRecord = {id, ...toast}
            setToasts((prev) => [...prev, record])
            if (duration !== Infinity) {
                window.setTimeout(() => {
                    setToasts((prev) => prev.filter((entry) => entry.id !== id))
                }, duration)
            }
        },
        []
    )

    const dismissToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{showToast}}>
            {children}
            {mounted && typeof document !== "undefined"
                ? createPortal(
                    <div
                        className="pointer-events-none fixed right-4 top-[5.5rem] z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-8 sm:top-[5rem] md:right-10">
                        {toasts.map((toast) => (
                            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast}/>
                        ))}
                    </div>,
                    document.body
                )
                : null}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = React.useContext(ToastContext)
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return ctx
}

function ToastCard({
                       toast,
                       onDismiss,
                   }: {
    toast: ToastRecord
    onDismiss: (id: string) => void
}) {
    const variantStyles: Record<ToastVariant, string> = {
        default: "border-border bg-background/95 text-foreground shadow-lg",
        success: "border-emerald-500/60 bg-background text-foreground shadow-lg",
        destructive: "border-red-500/60 bg-background text-foreground shadow-lg",
    }

    return (
        <div
            className={cn(
                "pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur",
                variantStyles[toast.variant ?? "default"]
            )}
        >
            <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1 text-sm">
                    <p className="font-semibold">{toast.title}</p>
                    {toast.description ? (
                        <p className="text-xs text-muted-foreground">{toast.description}</p>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="rounded-full p-1 text-xs text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                    onClick={() => onDismiss(toast.id)}
                >
                    <X className="size-4"/>
                </button>
            </div>
        </div>
    )
}
