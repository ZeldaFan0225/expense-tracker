"use client"

import * as React from "react"

import {cn} from "@/lib/utils"

const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(({className, children, ...props}, ref) => {
    return (
        <select
            ref={ref}
            className={cn(
                "flex w-full appearance-none rounded-xl border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                className
            )}
            {...props}
        >
            {children}
        </select>
    )
})
Select.displayName = "Select"

export {Select}
