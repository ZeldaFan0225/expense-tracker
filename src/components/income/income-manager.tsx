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
  }>
  currency?: string
}

export function IncomeManager({
  entries,
  currency = "USD",
}: IncomeManagerProps) {
  const [items, setItems] = React.useState(entries)
  const { showToast } = useToast()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      occurredOn: new Date().toISOString().split("T")[0],
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: values.description,
          amount: Number(values.amount),
          occurredOn: new Date(values.occurredOn),
        }),
      })
      if (!response.ok) throw new Error("Failed to record income")
      const income = await response.json()
      setItems((prev) => [income, ...prev].slice(0, 5))
      form.reset({
        description: "",
        amount: "",
        occurredOn: new Date().toISOString().split("T")[0],
      })
      showToast({
        title: "Income recorded",
        description: income.description,
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to record income",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>One-off income</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
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
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Add income"}
            </Button>
          </div>
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
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.occurredOn), "MMM d yyyy")}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(item.amount, currency)}
                </p>
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
