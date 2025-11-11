"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "success" | "destructive"

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastRecord = ToastInput & {
  id: string
}

type ToastContextValue = {
  toasts: ToastRecord[]
  showToast: (toast: ToastInput) => void
  dismissToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

function useToastContext() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("Toast components must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = React.useCallback(
    ({ duration = 4000, ...toast }: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const record: ToastRecord = { id, ...toast }
      setToasts((prev) => [...prev, record])
      if (duration !== Infinity) {
        window.setTimeout(() => dismissToast(id), duration)
      }
    },
    [dismissToast]
  )

  const value = React.useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
    }),
    [toasts, showToast, dismissToast]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const { showToast } = useToastContext()
  return { showToast }
}

export function ToastViewport({ className }: { className?: string }) {
  const { toasts, dismissToast } = useToastContext()
  const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null)

  const ref = React.useCallback((node: HTMLDivElement | null) => {
    setMountNode(node)
  }, [])

  return (
    <>
      <div ref={ref} className={cn("relative w-full", className)} />
      {mountNode && toasts.length
        ? createPortal(
            <div className="pointer-events-none absolute right-0 top-0 flex flex-col gap-3">
              {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
              ))}
            </div>,
            mountNode
          )
        : null}
    </>
  )
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
  success: "border-emerald-500/60 bg-background text-foreground shadow-emerald-200/30",
  destructive: "border-red-500/60 bg-background text-foreground shadow-red-200/30",
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
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
