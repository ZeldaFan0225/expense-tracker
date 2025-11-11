"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/providers/toast-provider"

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
]

type Schedule = {
  id: string
  name: string
  mode: string
  frequency: string
  template: string
  sourceUrl?: string | null
  nextRunAt?: string | null
  lastRunAt?: string | null
}

type ImportScheduleManagerProps = {
  initialSchedules: Schedule[]
}

export function ImportScheduleManager({ initialSchedules }: ImportScheduleManagerProps) {
  const [schedules, setSchedules] = React.useState(initialSchedules)
  const [form, setForm] = React.useState({
    name: "",
    mode: "expenses",
    template: "default",
    frequency: "monthly",
    sourceUrl: "",
  })
  const [saving, setSaving] = React.useState(false)
  const { showToast } = useToast()

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/import/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to create schedule")
      setSchedules((prev) => [data.schedule, ...prev])
      setForm({ name: "", mode: "expenses", template: "default", frequency: "monthly", sourceUrl: "" })
      showToast({
        title: "Schedule created",
        description: data.schedule.name,
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to create schedule",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/import/schedules/${id}`, { method: "DELETE" })
    if (response.ok) {
      setSchedules((prev) => prev.filter((schedule) => schedule.id !== id))
      showToast({
        title: "Schedule deleted",
      })
    } else {
      const data = await response.json()
      showToast({
        title: "Failed to delete schedule",
        description: data.error ?? "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRun = async (id: string) => {
    const response = await fetch(`/api/import/schedules/${id}/run`, {
      method: "POST",
    })
    const data = await response.json()
    if (response.ok) {
      setSchedules((prev) => prev.map((schedule) => (schedule.id === id ? data.schedule : schedule)))
      showToast({
        title: "Schedule marked as run",
      })
    } else {
      showToast({
        title: "Failed to mark run",
        description: data.error ?? "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Scheduled imports</CardTitle>
        <p className="text-sm text-muted-foreground">
          Store bank templates + reminder cadence.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="Monthly card dump"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onChange={(event) => handleChange("mode", event.target.value)}>
                <option value="expenses">Expenses</option>
                <option value="income">Income</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onChange={(event) => handleChange("frequency", event.target.value)}
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={form.template} onChange={(event) => handleChange("template", event.target.value)}>
              <option value="default">Default</option>
              <option value="monzo">Monzo</option>
              <option value="chase">Chase</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source URL (optional)</Label>
            <Input
              value={form.sourceUrl}
              onChange={(event) => handleChange("sourceUrl", event.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create schedule"}
          </Button>
        </form>

        <div className="space-y-3">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedules yet. Create one to receive reminders on this page.
            </p>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{schedule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.mode} · {schedule.frequency} · template {schedule.template}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRun(schedule.id)}
                    >
                      Mark run
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Next run {schedule.nextRunAt ? formatDistanceToNow(new Date(schedule.nextRunAt), { addSuffix: true }) : "soon"}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
