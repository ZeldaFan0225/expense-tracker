"use client"

import * as React from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/providers/toast-provider"

type Category = {
  id: string
  name: string
  color: string
}

const expenseItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  amount: z.string().min(1, "Amount required"),
  impactAmount: z.string().optional(),
  occurredOn: z.string().min(1),
  categoryId: z.string().optional(),
})

const builderSchema = z.object({
  items: z.array(expenseItemSchema).min(1).max(20),
  groupEnabled: z.boolean().optional(),
  group: z
    .object({
      title: z.string().min(1, "Title required"),
      notes: z.string().optional(),
      splitBy: z.string().optional(),
    })
    .partial()
    .optional(),
})

type FormValues = z.infer<typeof builderSchema>

type ExpenseItemBuilderProps = {
  categories: Category[]
  suggestions: string[]
}

export function ExpenseItemBuilder({
  categories,
  suggestions,
}: ExpenseItemBuilderProps) {
  const { showToast } = useToast()
  const [categoryHints, setCategoryHints] = React.useState<
    Record<string, { id: string; name: string }>
  >({})
  const [bulkCategory, setBulkCategory] = React.useState("")
  const [bulkDate, setBulkDate] = React.useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(builderSchema),
    defaultValues: {
      items: [createDefaultItem()],
      groupEnabled: false,
      group: undefined,
    },
  })

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const groupEnabled = watch("groupEnabled")

  React.useEffect(() => {
    if (groupEnabled) {
      const current = form.getValues("group")
      if (!current) {
        form.setValue("group", {
          title: "",
          notes: "",
          splitBy: "1",
        })
      }
    } else {
      form.setValue("group", undefined)
    }
  }, [groupEnabled, form])

  const requestCategorySuggestion = React.useCallback(
    async (fieldId: string, description: string) => {
      if (!description.trim()) return
      try {
        const params = new URLSearchParams({ description })
        const response = await fetch(
          `/api/expenses/suggest-category?${params.toString()}`
        )
        const data = await response.json()
        if (data?.suggestion) {
          setCategoryHints((prev) => ({
            ...prev,
            [fieldId]: data.suggestion,
          }))
        }
      } catch (err) {
        console.error(err)
      }
    },
    []
  )

  const applyBulkValues = () => {
    fields.forEach((field, index) => {
      if (bulkCategory) {
        form.setValue(`items.${index}.categoryId`, bulkCategory)
      }
      if (bulkDate) {
        form.setValue(`items.${index}.occurredOn`, bulkDate)
      }
    })
  }

  const expenseItems = fields.map((field, index) => {
    const descriptionField = register(`items.${index}.description` as const)
    return (
      <div
        key={field.id}
        className="rounded-2xl border p-4 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Expense {index + 1}
          </p>
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Team dinner"
              {...descriptionField}
              onBlur={(event) => {
                descriptionField.onBlur(event)
                requestCategorySuggestion(field.id, event.target.value)
              }}
            />
            <SuggestionRow
              onSelect={(value) =>
                form.setValue(`items.${index}.description`, value)
              }
              suggestions={suggestions}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select {...register(`items.${index}.categoryId` as const)}>
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {!watch(`items.${index}.categoryId`) && categoryHints[field.id] ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() =>
                  form.setValue(
                    `items.${index}.categoryId`,
                    categoryHints[field.id].id
                  )
                }
              >
                Apply suggestion: {categoryHints[field.id].name}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Amount"
            input={
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register(`items.${index}.amount` as const)}
              />
            }
          />
          <Field
            label="Impact amount"
            hint="Optional, overrides analytics value"
            input={
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register(`items.${index}.impactAmount` as const)}
              />
            }
          />
          <Field
            label="Date"
            input={
              <Input
                type="date"
                {...register(`items.${index}.occurredOn` as const)}
              />
            }
          />
        </div>
      </div>
    )
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        items: values.items.map((item) => ({
          description: item.description,
          amount: Number(item.amount),
          impactAmount: item.impactAmount
            ? Number(item.impactAmount)
            : undefined,
          occurredOn: new Date(item.occurredOn),
          categoryId: item.categoryId || undefined,
        })),
        group:
          groupEnabled && values.group
            ? {
                title: values.group.title ?? "",
                notes: values.group.notes,
                splitBy: Number(values.group.splitBy ?? "1"),
              }
            : undefined,
      }

      const response = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Failed to create expenses")
      }

      reset({
        items: [createDefaultItem()],
        groupEnabled: false,
        group: undefined,
      })
      showToast({
        title: "Expenses recorded",
        description: `${values.items.length} item(s) saved`,
        variant: "success",
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create expenses"
      showToast({
        title: "Failed to save expenses",
        description: message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Build up to 20 expenses at once</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">{expenseItems}</div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm font-medium">Bulk apply</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Override category or date across every pending item.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Category"
                input={
                  <Select
                    value={bulkCategory}
                    onChange={(event) => setBulkCategory(event.target.value)}
                  >
                    <option value="">Keep existing</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Date"
                input={
                  <Input
                    type="date"
                    value={bulkDate}
                    onChange={(event) => setBulkDate(event.target.value)}
                  />
                }
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={applyBulkValues}
                  disabled={!bulkCategory && !bulkDate}
                >
                  Apply to all
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => append(createDefaultItem())}
              disabled={fields.length >= 20}
            >
              Add another item
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save expenses"}
            </Button>
          </div>

          <div className="rounded-2xl border p-4 space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                {...register("groupEnabled")}
                className="size-4 rounded border"
              />
              Group these expenses
            </label>

            {groupEnabled ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Group title"
                  input={<Input {...register("group.title")} />}
                />
                <Field
                  label="Split by"
                  input={
                    <Input
                      type="number"
                      min="1"
                      defaultValue="1"
                      {...register("group.splitBy")}
                    />
                  }
                />
                <div className="md:col-span-2">
                  <Field
                    label="Notes"
                    input={<Textarea rows={3} {...register("group.notes")} />}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Grouping lets you add shared notes and split totals for
                reimbursements. Enable to configure.
              </p>
            )}
          </div>
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

function SuggestionRow({
  suggestions,
  onSelect,
}: {
  suggestions: string[]
  onSelect: (value: string) => void
}) {
  if (!suggestions.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.slice(0, 3).map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

function createDefaultItem() {
  return {
    description: "",
    amount: "",
    impactAmount: "",
    occurredOn: new Date().toISOString().split("T")[0],
    categoryId: "",
  }
}
