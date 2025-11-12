"use client"

import {type Session} from "next-auth"
import {SessionProvider} from "next-auth/react"
import {ThemeProvider} from "next-themes"
import {ToastProvider} from "@/components/providers/toast-provider"

type ProvidersProps = {
    session?: Session | null
    children: React.ReactNode
}

export function Providers({children, session}: ProvidersProps) {
    const defaultTheme = session?.user?.themePreference ?? "system"
    return (
        <SessionProvider session={session}>
            <ThemeProvider
                attribute="class"
                defaultTheme={defaultTheme as "light" | "dark" | "system"}
                enableSystem
                disableTransitionOnChange
            >
                <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
