"use client"

import Link from "next/link"
import {usePathname} from "next/navigation"
import {
    Activity,
    BadgeDollarSign,
    BookLock,
    ChartSpline,
    Home,
    KeyRound,
    LayoutDashboard,
    ListOrdered,
    Repeat2,
    Settings,
    Shield,
    Sparkles,
    UploadCloud,
    Wallet,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigation = [
    {
        label: "Workspace",
        items: [
            {title: "Home", href: "/home", icon: Home},
            {title: "Overview", href: "/", icon: LayoutDashboard},
            {title: "Add expense", href: "/items", icon: Wallet},
            {title: "Expenses", href: "/expenses", icon: ListOrdered},
            {title: "Analytics", href: "/analytics", icon: ChartSpline},
            {title: "Feed", href: "/feed", icon: Activity},
            {title: "Settings", href: "/settings", icon: Settings},
        ],
    },
    {
        label: "Automation",
        items: [
            {title: "Automation feed", href: "/automation-feed", icon: Sparkles},
            {title: "Recurring expenses", href: "/recurring", icon: Repeat2},
            {title: "Income planning", href: "/income", icon: BadgeDollarSign},
            {title: "Categories", href: "/categories", icon: Shield},
        ],
    },
    {
        label: "Data",
        items: [
            {title: "CSV import", href: "/import", icon: UploadCloud},
            {title: "API keys", href: "/api-keys", icon: KeyRound},
            {title: "API docs", href: "/docs", icon: BookLock},
        ],
    },
]

export function AppSidebar({
                               onQuickActionsClick,
                               ...props
                           }: React.ComponentProps<typeof Sidebar> & {
    onQuickActionsClick?: () => void
}) {
    const pathname = usePathname()

    return (
        <Sidebar variant="floating" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-3 px-2 py-4">
                    <div
                        className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-900 flex size-10 items-center justify-center rounded-2xl font-semibold">
                        EF
                    </div>
                    <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Expense Flow
            </span>
                        <span className="text-xs text-sidebar-foreground/70">
              encrypted finance OS
            </span>
                    </div>
                </div>
                <div className="px-2 pb-4">
                    <button
                        type="button"
                        onClick={onQuickActionsClick}
                        className="w-full rounded-2xl border border-sidebar-border/50 bg-sidebar/80 px-4 py-2 text-left text-sm font-semibold text-sidebar-foreground shadow-sm transition hover:border-sidebar-border"
                    >
                        Quick actions
                        <span
                            className="ml-2 rounded border border-sidebar-border/60 px-2 py-0.5 text-sm font-semibold text-sidebar-foreground/80">
              ⌘K
            </span>
                    </button>
                </div>
            </SidebarHeader>
            <SidebarContent>
                {navigation.map((section) => (
                    <SidebarGroup key={section.label}>
                        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => {
                                    const isActive =
                                        item.href === "/"
                                            ? pathname === "/"
                                            : pathname.startsWith(item.href)
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={isActive}>
                                                <Link href={item.href}>
                                                    <item.icon className="size-4"/>
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    )
}
