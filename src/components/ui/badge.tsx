import * as React from "react"

import {cn} from "@/lib/utils"

const variantClasses = {
    default:
        "border border-primary/30 bg-primary/10 text-primary transition-colors dark:border-primary/40 dark:bg-primary/30 dark:text-primary-foreground",
    outline:
        "border border-border text-foreground/80 dark:text-foreground",
} as const

export type BadgeVariant = keyof typeof variantClasses

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
    variant?: BadgeVariant
}

export function Badge({
                          className,
                          variant = "default",
                          ...props
                      }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                variantClasses[variant],
                className
            )}
            {...props}
        />
    )
}
