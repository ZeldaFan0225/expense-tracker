"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/providers/toast-provider"

const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD"]

type UserSettingsFormProps = {
  defaultCurrency: string
  accentColor?: string | null
}

export function UserSettingsForm({
  defaultCurrency,
  accentColor,
}: UserSettingsFormProps) {
  const [currency, setCurrency] = React.useState(defaultCurrency)
  const [accent, setAccent] = React.useState(accentColor ?? "#0ea5e9")
  const [saving, setSaving] = React.useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCurrency: currency.toUpperCase(),
          accentColor: accent,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Failed to update settings")
      }
      if (accent) {
        document.documentElement.style.setProperty("--user-accent", accent)
      }
      showToast({
        title: "Preferences saved",
        description: "Reload to sync across sessions.",
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to update settings",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <p className="text-sm text-muted-foreground">
          Currency formatting and workspace accent color.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field
            label="Default currency"
            input={
              <Select
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              >
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            }
            hint="Impacts dashboard + analytics formatting"
          />
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="h-10 w-20"
              />
              <Input
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="uppercase"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for quick actions + charts. Provide a valid hex code.
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  input,
  hint,
}: {
  label: string
  input: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
