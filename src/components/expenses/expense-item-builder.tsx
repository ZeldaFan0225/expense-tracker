"use client"

import * as React from "react"
import {
  useFieldArray,
  useForm,
  type FieldErrors,
  type Resolver,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/providers/toast-provider"
import {
  calculateImpactShare,
  normalizeSplitCount,
} from "@/lib/expense-shares"

type Category = {
  id: string
  name: string
  color: string
}

type ExistingItemInput = {
  id?: string
  description: string
  amount: number
  splitBy?: number | null
  occurredOn: string | Date
  categoryId?: string | null
}

type InitialGroupInput = {
  title?: string | null
  notes?: string | null
  splitBy?: number | null
}

type ItemField = "description" | "amount" | "splitBy" | "occurredOn"
type GroupField = "title" | "notes" | "splitBy"

const expenseItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description required"),
  amount: z.string().min(1, "Amount required"),
  splitBy: z.string().optional(),
  occurredOn: z.string().min(1, "Date required"),
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
    .optional(),
})

type FormValues = z.infer<typeof builderSchema>
export type ExpenseItemBuilderValues = FormValues

type ExpenseItemBuilderProps = {
  categories: Category[]
  suggestions: string[]
  initialItems?: ExistingItemInput[]
  initialGroup?: InitialGroupInput
  submitLabel?: string
  onSubmitOverride?: (values: FormValues) => Promise<void>
  disableAutoReset?: boolean
}

export function ExpenseItemBuilder({
  categories,
  suggestions,
  initialItems,
  initialGroup,
  submitLabel = "Save expenses",
  onSubmitOverride,
  disableAutoReset = false,
}: ExpenseItemBuilderProps) {
  const { showToast } = useToast()
  const [categoryHints, setCategoryHints] = React.useState<
    Record<string, { id: string; name: string }>
  >({})
  const [bulkCategory, setBulkCategory] = React.useState("")
  const [bulkDate, setBulkDate] = React.useState("")

  const defaultValues = React.useMemo(() => {
    const mappedItems = (initialItems && initialItems.length
      ? initialItems
      : [undefined]
    ).map((item) => createDefaultItem(item))
    const hasGroup = Boolean(initialGroup) || mappedItems.length > 1
    return {
      items: mappedItems,
      groupEnabled: hasGroup,
      group: hasGroup
        ? {
            title: initialGroup?.title ?? "",
            notes: initialGroup?.notes ?? "",
            splitBy: (initialGroup?.splitBy ?? 1).toString(),
          }
        : undefined,
    }
  }, [initialItems, initialGroup])

  const form = useForm<FormValues>({
    resolver: zodResolver(builderSchema) as Resolver<FormValues>,
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { isSubmitting, errors },
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
      setTimeout(() => setFocus("group.title"), 0)
    } else {
      form.setValue("group", undefined)
    }
  }, [groupEnabled, form])

  const getItemError = (index: number, field: ItemField) => {
    const fieldError =
      (errors.items?.[index] as Partial<
        Record<ItemField, { message?: string }>
      > | undefined)?.[field]
    const message = fieldError?.message
    return typeof message === "string" ? message : undefined
  }

  const getGroupError = (field: GroupField) => {
    const fieldError = (errors.group as Partial<
      Record<GroupField, { message?: string }>
    > | undefined)?.[field]
    const message = fieldError?.message
    return typeof message === "string" ? message : undefined
  }

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
    const descriptionError = getItemError(index, "description")
    const amountError = getItemError(index, "amount")
    const splitError = getItemError(index, "splitBy")
    const occurredOnError = getItemError(index, "occurredOn")
    return (
      <div
        key={field.id}
        className="rounded-2xl border p-4 shadow-xs space-y-4"
      >
        <input type="hidden" {...register(`items.${index}.id` as const)} />
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
              aria-invalid={Boolean(descriptionError)}
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
            <ErrorText message={descriptionError} />
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

        <div
          className={
            groupEnabled ? "grid gap-4 md:grid-cols-2" : "grid gap-4 md:grid-cols-3"
          }
        >
          <Field
            label="Amount"
            error={amountError}
            input={
              <Input
                type="number"
                step="0.01"
                min="0"
                aria-invalid={Boolean(amountError)}
                {...register(`items.${index}.amount` as const)}
              />
            }
          />
          {!groupEnabled ? (
            <Field
              label="Split by"
              hint="Divide this amount across equal shares"
              error={splitError}
              input={
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  aria-invalid={Boolean(splitError)}
                  {...register(`items.${index}.splitBy` as const)}
                />
              }
            />
          ) : null}
          <Field
            label="Date"
            error={occurredOnError}
            input={
              <Input
                type="date"
                aria-invalid={Boolean(occurredOnError)}
                {...register(`items.${index}.occurredOn` as const)}
              />
            }
          />
        </div>
      </div>
    )
  })

  const onSubmit = async (values: FormValues) => {
    if (onSubmitOverride) {
      await onSubmitOverride(values)
      return
    }

    const isEditing = values.items.length === 1 && values.items[0].id

    try {
      if (isEditing) {
        // --- EDIT LOGIC ---
        const item = values.items[0]
        const splitValue = normalizeSplitCount(item.splitBy)
        const payload = {
          description: item.description,
          amount: Number(item.amount),
          occurredOn: new Date(item.occurredOn),
          categoryId: item.categoryId || undefined,
          splitBy: splitValue > 1 ? splitValue : undefined,
        }

        const response = await fetch(`/api/expenses/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error ?? "Failed to update expense")
        }

        showToast({
          title: "Expense updated",
          variant: "success",
        })
      } else {
        // --- CREATE LOGIC ---
        const isGroupEnabled = Boolean(values.groupEnabled)
        const payload = {
          items: values.items.map((item) => {
            const amountValue = Number(item.amount)
            const splitValue = isGroupEnabled
              ? 1
              : normalizeSplitCount(item.splitBy)

            return {
              description: item.description,
              amount: amountValue,
              splitBy:
                !isGroupEnabled && splitValue > 1 ? splitValue : undefined,
              occurredOn: new Date(item.occurredOn),
              categoryId: item.categoryId || undefined,
            }
          }),
          group:
            isGroupEnabled && values.group
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

        if (!disableAutoReset) {
          reset({
            items: [createDefaultItem()],
            groupEnabled: false,
            group: undefined,
          })
        }
        showToast({
          title: "Expenses recorded",
          description: `${values.items.length} item(s) saved`,
          variant: "success",
        })
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save expenses"
      showToast({
        title: "Failed to save expenses",
        description: message,
        variant: "destructive",
      })
    }
  }

  const onInvalid = React.useCallback(
    (errors: FieldErrors<FormValues>) => {
      console.log(errors)
      const messages: string[] = []

      errors.items?.forEach?.((itemError, index) => {
        if (!itemError) return
        if (itemError.description?.message) {
          messages.push(`Expense ${index + 1}: ${itemError.description.message}`)
        }
        if (itemError.amount?.message) {
          messages.push(`Expense ${index + 1}: ${itemError.amount.message}`)
        }
        if (itemError.occurredOn?.message) {
          messages.push(`Expense ${index + 1}: ${itemError.occurredOn.message}`)
        }
        if (itemError.splitBy?.message) {
          messages.push(`Expense ${index + 1}: ${itemError.splitBy.message}`)
        }
      })

      if (errors.group?.title?.message) {
        messages.push(`Group: ${errors.group.title.message}`)
      }
      if (errors.group?.splitBy?.message) {
        messages.push(`Group: ${errors.group.splitBy.message}`)
      }

      const description =
        messages.length > 0
          ? messages.join("; ")
          : "Fill in every required value before saving."

      showToast({
        title: "Please fix the errors",
        description,
        variant: "destructive",
      })
    },
    [showToast]
  )

  const groupTitleError = getGroupError("title")
  const groupSplitError = getGroupError("splitBy")
  const groupNotesError = getGroupError("notes")

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Build up to 20 expenses at once</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
              {isSubmitting ? "Saving..." : submitLabel}
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
                  error={groupTitleError}
                  input={
                    <Input
                      {...register("group.title")}
                      aria-invalid={Boolean(groupTitleError)}
                    />
                  }
                />
                <Field
                  label="Split by"
                  error={groupSplitError}
                  input={
                    <Input
                      type="number"
                      min="1"
                      defaultValue="1"
                      aria-invalid={Boolean(groupSplitError)}
                      {...register("group.splitBy")}
                    />
                  }
                />
                <div className="md:col-span-2">
                  <Field
                    label="Notes"
                    error={groupNotesError}
                    input={
                      <Textarea
                        rows={3}
                        {...register("group.notes")}
                        aria-invalid={Boolean(groupNotesError)}
                      />
                    }
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
  error,
}: {
  label: string
  input: React.ReactNode
  hint?: string
  error?: string | null
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <ErrorText message={error} />
    </div>
  )
}

function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
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

function createDefaultItem(item?: ExistingItemInput) {
  const occurredOnDate = item?.occurredOn
    ? new Date(item.occurredOn)
    : new Date()
  const safeDate = Number.isNaN(occurredOnDate.getTime())
    ? new Date()
    : occurredOnDate

  const normalizedSplit = normalizeSplitCount(item?.splitBy ?? 1)

  return {
    id: item?.id,
    description: item?.description ?? "",
    amount:
      typeof item?.amount === "number" && !Number.isNaN(item.amount)
        ? item.amount.toString()
        : "",
    splitBy: normalizedSplit.toString(),
    occurredOn: safeDate.toISOString().split("T")[0],
    categoryId: item?.categoryId ?? "",
  }
}
