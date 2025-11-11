"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/providers/toast-provider"

const formSchema = z.object({
  description: z.string().optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  expiresAt: z.string().optional(),
})

type ApiKeyInput = {
  id: string
  prefix: string
  scopes: string[]
  createdAt: string | Date
  revokedAt: string | Date | null
  expiresAt: string | Date | null
  description?: string | null
}

type ApiKeyRecord = {
  id: string
  prefix: string
  scopes: string[]
  createdAt: string
  revokedAt: string | null
  expiresAt: string | null
  description?: string | null
}

type ApiKeysManagerProps = {
  keys: ApiKeyInput[]
}

const SCOPES = [
  {
    value: "expenses:read",
    label: "Expenses read",
    description: "List and inspect encrypted expenses, groups, and categories.",
  },
  {
    value: "expenses:write",
    label: "Expenses write",
    description: "Create, update, and delete single or bulk expense entries.",
  },
  {
    value: "analytics:read",
    label: "Analytics read",
    description: "Fetch balance series, comparisons, exports, and feed data.",
  },
  {
    value: "income:write",
    label: "Income write",
    description: "Record single income items and recurring templates.",
  },
  {
    value: "budget:read",
    label: "Budget read",
    description: "Pull monthly overview totals and category breakdowns.",
  },
]

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value
}

function serializeKeyRecord(record: ApiKeyInput): ApiKeyRecord {
  return {
    ...record,
    createdAt: toIso(record.createdAt),
    revokedAt: record.revokedAt ? toIso(record.revokedAt) : null,
    expiresAt: record.expiresAt ? toIso(record.expiresAt) : null,
  }
}

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export function ApiKeysManager({ keys }: ApiKeysManagerProps) {
  const [items, setItems] = React.useState<ApiKeyRecord[]>(() =>
    keys.map(serializeKeyRecord)
  )
  const [token, setToken] = React.useState<string | null>(null)
  const { showToast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scopes: ["expenses:read"],
      description: "",
      expiresAt: "",
    },
  })
  const selectedScopes = form.watch("scopes")

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setToken(null)
    try {
      const payload = {
        description: values.description,
        scopes: values.scopes,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      }
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to create key")
      setToken(data.token)
      setItems((prev) => [serializeKeyRecord(data.record), ...prev])
      form.reset({
        scopes: ["expenses:read"],
        description: "",
        expiresAt: "",
      })
      showToast({
        title: "API key created",
        description: "Copy the token now—this is the only time it is shown.",
        variant: "success",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create key"
      showToast({
        title: "Unable to create API key",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleKeyAction = async (item: ApiKeyRecord) => {
    try {
      const response = await fetch(`/api/api-keys/${item.id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update key")
      }
      if (data.action === "deleted") {
        setItems((prev) => prev.filter((entry) => entry.id !== item.id))
        showToast({
          title: "API key deleted",
          description: "The revoked key has been permanently removed.",
          variant: "success",
        })
      } else {
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, revokedAt: new Date().toISOString() } : entry
          )
        )
        showToast({
          title: "API key revoked",
          description: "The token is no longer valid for API calls.",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update key"
      showToast({
        title: "Unable to update API key",
        description: message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>API keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Field label="Description">
            <Input {...form.register("description")} placeholder="CI automation" />
          </Field>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Scopes</Label>
              <p className="text-xs text-muted-foreground">
                Scopes limit what each token can do. Combine only the permissions your integration needs.
              </p>
            </div>
            <div className="grid gap-3">
              {SCOPES.map((scope) => {
                const checked = selectedScopes.includes(scope.value)
                return (
                  <label
                    key={scope.value}
                    className={`flex gap-3 rounded-2xl border px-3 py-3 transition ${
                      checked ? "border-primary/50 bg-primary/5" : "hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={scope.value}
                      {...form.register("scopes")}
                      className="mt-1 size-4 rounded border"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span>{scope.label}</span>
                        <code className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {scope.value}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scope.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expires on (optional)</Label>
            <Input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              {...form.register("expiresAt")}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for a permanent key. Expired keys are automatically revoked by the automation worker.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create key"}
            </Button>
          </div>
        </form>
        {token ? (
          <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">Copy this token now:</p>
            <code className="mt-2 block truncate rounded-lg bg-background px-3 py-2 text-xs">
              {token}
            </code>
          </div>
        ) : null}
        <div className="space-y-3">
          {items.map((item) => {
            const createdLabel = formatDate(item.createdAt)
            const expiresLabel = formatDate(item.expiresAt)
            const expired = isExpired(item.expiresAt)
            const revoked = Boolean(item.revokedAt)
            const status = revoked ? "Revoked" : expired ? "Expired" : "Active"
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">exp_{item.prefix}</p>
                    <Badge variant={revoked || expired ? "outline" : "default"}>
                      {status}
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {createdLabel ? <span>Created {createdLabel}</span> : null}
                    {createdLabel ? <span>•</span> : null}
                    <span>{expiresLabel ? `Expires ${expiresLabel}` : "No expiry"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.scopes.map((scope) => (
                      <Badge key={scope} variant="outline">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant={revoked ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => handleKeyAction(item)}
                >
                  {revoked ? "Delete" : "Revoke"}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
