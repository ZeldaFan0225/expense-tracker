"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type DashboardShellProps = {
  heading: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  user?: {
    name?: string | null
    email?: string | null
    defaultCurrency?: string | null
    themePreference?: string | null
    accentColor?: string | null
  }
}

export function DashboardShell({
  heading,
  description,
  actions,
  children,
  user,
}: DashboardShellProps) {
  const router = useRouter()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const accent = user?.accentColor ?? "var(--chart-1)"
  const quickActions = React.useMemo(
    () => [
      {
        label: "New expense",
        description: "Open the bulk builder",
        href: "/items",
        shortcutKey: "n",
        shortcutCode: "KeyN",
      },
      {
        label: "Analytics",
        description: "Jump to insights dashboard",
        href: "/analytics",
        shortcutKey: "a",
        shortcutCode: "KeyA",
      },
      {
        label: "Import CSV",
        description: "Preview and ingest files",
        href: "/import",
        shortcutKey: "i",
        shortcutCode: "KeyI",
      },
      {
        label: "Generate API key",
        description: "Manage secure tokens",
        href: "/api-keys",
        shortcutKey: "k",
        shortcutCode: "KeyK",
      },
      {
        label: "Activity feed",
        description: "Chronological ledger",
        href: "/feed",
        shortcutKey: "f",
        shortcutCode: "KeyF",
      },
    ],
    []
  )

  const handleAction = React.useCallback(
    (href: string) => {
      setPaletteOpen(false)
      router.push(href)
    },
    [router]
  )

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
        return
      }

      if (event.altKey && event.shiftKey) {
        const action = quickActions.find(
          (item) =>
            item.shortcutCode
              ? item.shortcutCode === event.code
              : item.shortcutKey?.toLowerCase() === event.key.toLowerCase()
        )
        if (action) {
          event.preventDefault()
          handleAction(action.href)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [quickActions, handleAction])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--user-accent": accent,
        } as React.CSSProperties
      }
    >
      <AppSidebar onQuickActionsClick={() => setPaletteOpen(true)} />
      <SidebarInset className="flex flex-col md:h-screen">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-6 border-border" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{heading}</p>
                {description ? (
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
                  <span className="max-w-[9rem] truncate font-medium">
                    {user.name ?? user.email ?? "You"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => signOut({ redirectTo: "/" })}
                  >
                    Sign out
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
            {children}
          </div>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          actions={quickActions}
          onSelect={handleAction}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

type PaletteAction = {
  label: string
  description: string
  href: string
  shortcutKey?: string
}

function CommandPalette({
  open,
  onOpenChange,
  actions,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: PaletteAction[]
  onSelect: (href: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const filtered = actions.filter((action) =>
    `${action.label} ${action.description}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl border-0 bg-background/95 backdrop-blur"
        aria-label="Command palette"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="Search actions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-80 overflow-y-auto rounded-2xl border">
            {filtered.length ? (
              <ul className="divide-y">
                {filtered.map((action) => (
                  <li key={action.href}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/60"
                      onClick={() => onSelect(action.href)}
                    >
                      <div>
                        <p className="font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      {action.shortcutKey ? (
                        <kbd className="rounded border px-2 py-1 text-xs text-muted-foreground">
                          {formatShortcut(action.shortcutKey)}
                        </kbd>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No actions found.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatShortcut(key: string) {
  return `⌥⇧ ${key.toUpperCase()}`
}
