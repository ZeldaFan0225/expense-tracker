"use client"

import * as React from "react"

import {cn} from "@/lib/utils"

type TabsProps = {
    tabs: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
}

export function Tabs({tabs, value, onChange}: TabsProps) {
    return (
        <div className="inline-flex items-center rounded-full border bg-muted/30 p-1 text-sm font-medium">
            {tabs.map((tab) => {
                const isActive = tab.value === value
                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => onChange(tab.value)}
                        className={cn(
                            "rounded-full px-4 py-1.5 transition-colors",
                            isActive
                                ? "bg-background shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
