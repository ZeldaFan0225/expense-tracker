import type {Metadata} from "next"
import {Geist, Geist_Mono} from "next/font/google"
import {Providers} from "@/components/providers"
import {auth} from "@/lib/auth-server"
import "./globals.css"
import "@/lib/automation/startup"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Expense Flow",
    description:
        "Encrypted multi-user expense and income tracking with analytics and automation.",
    icons: {
        icon: "/favicon.ico",
    },
}

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode
}>) {
    const session = await auth()
    return (
        <html lang="en" suppressHydrationWarning>
        <body
            className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-screen antialiased`}
        >
        <Providers session={session}>{children}</Providers>
        </body>
        </html>
    )
}
