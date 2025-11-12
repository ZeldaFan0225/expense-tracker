import * as React from "react"

import {cn} from "@/lib/utils"

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({className, ...props}, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export {Textarea}
