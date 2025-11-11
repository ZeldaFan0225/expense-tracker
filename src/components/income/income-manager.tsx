"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/currency"
import { useToast } from "@/components/providers/toast-provider"

const formSchema = z.object({
  description: z.string().min(1),
  amount: z.string().min(1),
  occurredOn: z.string().min(1),
})

type FormValues = z.infer<typeof formSchema>

type IncomeManagerProps = {
  entries: Array<{
    id: string
    occurredOn: string | Date
    amount: number
    description: string
    recurringSourceId?: string | null
  }>
  currency?: string
}

export function IncomeManager({
  entries,
  currency = "USD",
}: IncomeManagerProps) {
  const [items, setItems] = React.useState(entries)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const { showToast } = useToast()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      occurredOn: new Date().toISOString().split("T")[0],
    },
  })

  const resetForm = React.useCallback(() => {
    form.reset({
      description: "",
      amount: "",
      occurredOn: new Date().toISOString().split("T")[0],
    })
    setEditingId(null)
  }, [form])

  const formId = "one-off-income-form"

  const onSubmit = async (values: FormValues) => {
    const payload = {
      description: values.description,
      amount: Number(values.amount),
      occurredOn: new Date(values.occurredOn),
    }
    try {
      if (editingId) {
        const response = await fetch(`/api/income/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error("Failed to update income")
        const updated = await response.json()
        setItems((prev) =>
          prev.map((entry) => (entry.id === editingId ? updated : entry))
        )
        showToast({
          title: "Income updated",
          description: updated.description,
          variant: "success",
        })
      } else {
        const response = await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error("Failed to record income")
        const income = await response.json()
        setItems((prev) => [income, ...prev].slice(0, 5))
        showToast({
          title: "Income recorded",
          description: income.description,
          variant: "success",
        })
      }
      resetForm()
    } catch (err) {
      showToast({
        title: editingId ? "Failed to update income" : "Failed to record income",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteIncomeEntry = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/income/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete income")
      setItems((prev) => prev.filter((entry) => entry.id !== id))
      if (editingId === id) {
        resetForm()
      }
      showToast({
        title: "Income deleted",
        variant: "default",
      })
    } catch (err) {
      showToast({
        title: "Failed to delete income",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>One-off income</CardTitle>
        <div className="flex items-center gap-2">
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            form={formId}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Add income"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-3"
        >
          <Field label="Description">
            <Input
              placeholder="Consulting retainer"
              {...form.register("description")}
            />
          </Field>
          <Field label="Amount">
            <Input type="number" step="0.01" {...form.register("amount")} />
          </Field>
          <Field label="Date">
            <Input type="date" {...form.register("occurredOn")} />
          </Field>
        </form>
        <div className="rounded-2xl border p-4">
          <p className="text-sm font-semibold">Recent entries</p>
          <ul className="mt-3 divide-y text-sm">
            {items.length === 0 ? (
              <li className="py-3 text-muted-foreground">No entries yet.</li>
            ) : null}
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.occurredOn), "MMM d yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">
                    {formatCurrency(item.amount, currency)}
                  </p>
                  {item.recurringSourceId ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(item.id)
                        form.reset({
                          description: item.description,
                          amount: item.amount.toString(),
                          occurredOn: new Date(item.occurredOn)
                            .toISOString()
                            .split("T")[0],
                        })
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteIncomeEntry(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
