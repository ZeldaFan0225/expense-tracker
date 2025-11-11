"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import { useToast } from "@/components/providers/toast-provider"

type RecurringTemplate = {
  id: string
  categoryId: string | null
  dueDayOfMonth: number
  splitBy: number
  isActive: boolean
  amount: number
  description: string
  lastGeneratedOn: string | Date | null
}

type Category = {
  id: string
  name: string
}

const formSchema = z.object({
  description: z.string().min(1),
  amount: z.string().min(1),
  categoryId: z.string().optional(),
  dueDayOfMonth: z.string().min(1),
  splitBy: z.string().min(1),
})

type RecurringManagerProps = {
  templates: RecurringTemplate[]
  categories: Category[]
  currency?: string
}

export function RecurringManager({
  templates,
  categories,
  currency = "USD",
}: RecurringManagerProps) {
  const [items, setItems] = React.useState(templates)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const { showToast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      categoryId: "",
      dueDayOfMonth: "1",
      splitBy: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: values.description,
          amount: Number(values.amount),
          categoryId: values.categoryId || undefined,
          dueDayOfMonth: Number(values.dueDayOfMonth),
          splitBy: Number(values.splitBy),
        }),
      })
      if (!response.ok) throw new Error("Failed to create template")
      const template = await response.json()
      setItems((prev) => [template, ...prev])
      form.reset()
      showToast({
        title: "Recurring expense created",
        description: "New template ready to auto-post.",
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to create template",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleTemplate = async (id: string) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: "PUT",
      })
      if (!response.ok) throw new Error("Failed to toggle")
      const template = await response.json()
      setItems((prev) => prev.map((item) => (item.id === id ? template : item)))
      showToast({
        title: template.isActive ? "Template resumed" : "Template paused",
        description: template.description,
      })
    } catch (err) {
      showToast({
        title: "Failed to update template",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  const deleteTemplate = async (id: string) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete")
      setItems((prev) => prev.filter((item) => item.id !== id))
      showToast({
        title: "Recurring template removed",
        variant: "default",
      })
    } catch (err) {
      showToast({
        title: "Failed to delete template",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>New recurring expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 md:grid-cols-2"
          >
            <Field label="Description">
              <Input {...form.register("description")} placeholder="Coworking" />
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                step="0.01"
                {...form.register("amount")}
                placeholder="250"
              />
            </Field>
            <Field label="Category">
              <Select {...form.register("categoryId")}>
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due day">
              <Input
                type="number"
                min="1"
                max="28"
                {...form.register("dueDayOfMonth")}
              />
            </Field>
            <Field label="Split by" hint="Divide impact across shares">
              <Input
                type="number"
                min="1"
                {...form.register("splitBy")}
              />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Create template"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Existing templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : null}
            {items.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold">{template.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Due day {template.dueDayOfMonth} ·{" "}
                    {formatCurrency(template.amount, currency)} · Split{" "}
                    {template.splitBy}x
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleTemplate(template.id)}
                    disabled={loadingId === template.id}
                  >
                    {template.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    disabled={loadingId === template.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
