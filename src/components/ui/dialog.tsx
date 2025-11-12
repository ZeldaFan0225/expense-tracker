"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {X} from "lucide-react"
import {cn} from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({className, ...props}: DialogPrimitive.DialogOverlayProps) => (
    <DialogPrimitive.Overlay
        className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
            className
        )}
        {...props}
    />
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({className, children, "aria-label": ariaLabel, ...props}, ref) => (
    <DialogPortal>
        <DialogOverlay/>
        <DialogPrimitive.Content
            ref={ref}
            aria-label={ariaLabel ?? "Dialog window"}
            className={cn(
                "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-6 shadow-lg focus:outline-none",
                className
            )}
            {...props}
        >
            {children}
            <DialogClose
                className="absolute right-4 top-4 rounded-full border p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4"/>
                <span className="sr-only">Close</span>
            </DialogClose>
        </DialogPrimitive.Content>
    </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = ({className, ...props}: React.HTMLAttributes<HTMLHeadingElement>) => (
    <DialogPrimitive.Title
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
    />
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = ({
                               className,
                               ...props
                           }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <DialogPrimitive.Description
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
}
