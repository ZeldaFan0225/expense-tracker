"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import { useToast } from "@/components/providers/toast-provider"

const formSchema = z.object({
  description: z.string().min(1),
  amount: z.string().min(1),
  dueDayOfMonth: z.string().min(1),
})

type RecurringIncome = {
  id: string
  description: string
  amount: number
  dueDayOfMonth: number
  isActive: boolean
}

type RecurringIncomeManagerProps = {
  templates: RecurringIncome[]
  currency?: string
}

export function RecurringIncomeManager({
  templates,
  currency = "USD",
}: RecurringIncomeManagerProps) {
  const [items, setItems] = React.useState(templates)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const { showToast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      dueDayOfMonth: "1",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch("/api/income/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: values.description,
          amount: Number(values.amount),
          dueDayOfMonth: Number(values.dueDayOfMonth),
        }),
      })
      if (!response.ok) throw new Error("Failed to create template")
      const template = await response.json()
      setItems((prev) => [template, ...prev])
      form.reset({
        description: "",
        amount: "",
        dueDayOfMonth: "1",
      })
      showToast({
        title: "Recurring income added",
        description: template.description,
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

  const deleteTemplate = async (id: string) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/income/recurring/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete template")
      setItems((prev) => prev.filter((item) => item.id !== id))
      showToast({
        title: "Recurring income removed",
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
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Recurring income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-3"
        >
          <Field label="Description">
            <Input {...form.register("description")} />
          </Field>
          <Field label="Amount">
            <Input type="number" step="0.01" {...form.register("amount")} />
          </Field>
          <Field label="Due day">
            <Input type="number" min="1" max="28" {...form.register("dueDayOfMonth")} />
          </Field>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Create template"}
            </Button>
          </div>
        </form>
        <div className="divide-y rounded-2xl border">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No recurring income configured.
            </p>
          ) : null}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  Due day {item.dueDayOfMonth} ·{" "}
                  {formatCurrency(item.amount, currency)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTemplate(item.id)}
                disabled={loadingId === item.id}
              >
                Remove
              </Button>
            </div>
          ))}
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
