"use client"

import { useTheme } from "next-themes"
import { Check, Laptop, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const themeOptions = [
  {
    label: "System",
    description: "Follow your OS preference",
    value: "system",
    icon: Laptop,
  },
  {
    label: "Light",
    description: "Bright theme with pale sidebar",
    value: "light",
    icon: Sun,
  },
  {
    label: "Dark",
    description: "Dim theme that reduces glare",
    value: "dark",
    icon: Moon,
  },
] as const

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const activeTheme = theme ?? "system"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Open theme menu"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Theme</p>
        <div className="mt-2 space-y-2">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = activeTheme === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-foreground transition-colors hover:bg-muted",
                  isActive && "border-primary bg-primary/10 text-primary"
                )}
              >
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-4 text-foreground" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                {isActive ? <Check className="size-4" /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
