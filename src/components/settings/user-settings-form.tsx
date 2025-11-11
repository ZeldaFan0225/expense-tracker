"use client"

import * as React from "react"
import { signOut } from "next-auth/react"
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
  const [deleteConfirm, setDeleteConfirm] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)
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

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      showToast({
        title: "Type DELETE to confirm",
        description: "This safeguard prevents accidental deletion.",
        variant: "destructive",
      })
      return
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "This will permanently delete your account, API keys, expenses, income, and automations. This cannot be undone. Continue?"
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch("/api/settings", { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to delete account")
      }
      showToast({
        title: "Account deleted",
        description: "Signing you out…",
        variant: "success",
      })
      await signOut({ callbackUrl: "/" })
    } catch (err) {
      showToast({
        title: "Failed to delete account",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
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

      <Card className="rounded-3xl border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <p className="text-sm text-muted-foreground">
            Delete your account and erase all encrypted data. This action cannot be undone.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())}
              placeholder="DELETE"
              className="uppercase"
              aria-describedby="deleteConfirmHelp"
            />
            <p id="deleteConfirmHelp" className="text-xs text-muted-foreground">
              This protects against accidental clicks. All expenses, income, categories, API keys, and schedules will be removed.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </CardContent>
      </Card>
    </div>
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
