"use client"

import * as React from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { useToast } from "@/components/providers/toast-provider"
import { ExpenseItemBuilder, type ExpenseItemBuilderValues } from "@/components/expenses/expense-item-builder"

type ExpenseRow = {
  id: string
  description: string
  occurredOn: string
  categoryId: string | null
  categoryName: string
  amount: number
  impactAmount: number
  groupId?: string | null
  groupTitle?: string | null
  groupNotes?: string | null
  splitBy?: number | null
}

type ExpenseListProps = {

  initialExpenses: ExpenseRow[]

  currency: string

  categories: Array<{ id: string; name: string; color: string }>

  suggestions: string[]

}

type EditingContext = {
  expenseIds: string[]
  items: ExpenseRow[]
  anchorId: string
  group?: {
    title?: string | null
    notes?: string | null
    splitBy?: number | null
  }
}

function mapApiExpenseToRow(payload: any): ExpenseRow {
  return {
    id: payload.id,
    description: payload.description,
    occurredOn: new Date(payload.occurredOn).toISOString(),
    categoryId: payload.category?.id ?? null,
    categoryName: payload.category?.name ?? "Uncategorized",
    amount: payload.amount,
    impactAmount: payload.impactAmount,
    groupId: payload.group?.id ?? null,
    groupTitle: payload.group?.title ?? null,
    groupNotes: payload.group?.notes ?? null,
    splitBy: payload.group?.splitBy ?? null,
  }
}

function sortExpenses(rows: ExpenseRow[]) {
  return [...rows].sort(
    (a, b) =>
      new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()
  )
}

export function ExpenseList({
  initialExpenses,
  currency,
  categories,
  suggestions,
}: ExpenseListProps) {
  const { showToast } = useToast()
  const [expenses, setExpenses] = React.useState(() => sortExpenses(initialExpenses))
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [editingContext, setEditingContext] = React.useState<EditingContext | null>(null)

  const closeEditor = React.useCallback(() => {
    setEditingContext(null)
  }, [])

  const startEdit = (expense: ExpenseRow) => {
    const related = expense.groupId
      ? expenses.filter((entry) => entry.groupId === expense.groupId)
      : [expense]
    const context: EditingContext = {
      expenseIds: related.map((entry) => entry.id),
      items: related,
      anchorId: expense.id,
      group: expense.groupId
        ? {
            title: expense.groupTitle ?? "",
            notes: expense.groupNotes ?? "",
            splitBy: expense.splitBy ?? 1,
          }
        : undefined,
    }
    setEditingContext(context)
  }

  const deleteExpense = async (id: string) => {
    const target = expenses.find((expense) => expense.id === id)
    if (!target) return

    const confirmed = window.confirm(
      `Delete "${target.description}" from ${format(new Date(target.occurredOn), "MMM d, yyyy")}?`
    )
    if (!confirmed) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Failed to delete expense")
      }
      setExpenses((prev) => prev.filter((expense) => expense.id !== id))
      showToast({
        title: "Expense deleted",
        description: target.description,
      })
    } catch (error) {
      showToast({
        title: "Unable to delete expense",
        description: error instanceof Error ? error.message : "Try again shortly",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleReplace = React.useCallback(
    async (values: ExpenseItemBuilderValues) => {
      if (!editingContext) return
      try {
        const payload = {
          expenseIds: editingContext.expenseIds,
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
            values.groupEnabled && values.group
              ? {
                  title: values.group.title ?? "",
                  notes: values.group.notes,
                  splitBy: Number(values.group.splitBy ?? "1"),
                }
              : undefined,
        }

        const response = await fetch("/api/expenses/replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to save changes")
        }

        const data = await response.json()
        const normalized: ExpenseRow[] = data.map(mapApiExpenseToRow)
        setExpenses((prev) => {
          const remaining = prev.filter(
            (expense) => !editingContext.expenseIds.includes(expense.id)
          )
          return sortExpenses([...normalized, ...remaining])
        })

        showToast({
          title: "Expenses updated",
          description: `${normalized.length} item(s) refreshed`,
          variant: "success",
        })
        closeEditor()
      } catch (error) {
        showToast({
          title: "Unable to update expenses",
          description: error instanceof Error ? error.message : "Try again shortly",
          variant: "destructive",
        })
      }
    },
    [closeEditor, editingContext, showToast]
  )

  const editingItems = React.useMemo(() => {
    if (!editingContext) return []
    return editingContext.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      impactAmount: item.impactAmount,
      occurredOn: item.occurredOn,
      categoryId: item.categoryId ?? undefined,
    }))
  }, [editingContext])

  return (
    <>
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All expenses</CardTitle>
            <p className="text-sm text-muted-foreground">
              {expenses.length} tracked entr{expenses.length === 1 ? "y" : "ies"}. Edit with
              the same builder you use for quick capture or remove items you no longer need.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 pr-3 text-right font-medium">Impact</th>
                    <th className="pb-2 pr-3 text-right font-medium">Original</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((expense) => {
                    const dateLabel = format(new Date(expense.occurredOn), "MMM d, yyyy")
                    const differs = Math.abs(expense.amount - expense.impactAmount) > 0.005
                    const splitLabel =
                      expense.splitBy && expense.splitBy > 1 ? `${expense.splitBy}-way split` : null
                    return (
                      <React.Fragment key={expense.id}>
                        <tr className="align-middle">
                          <td className="py-3">
                            <p className="font-medium text-foreground">{expense.description}</p>
                            {expense.groupTitle ? (
                              <p className="text-xs text-muted-foreground">
                                Group: {expense.groupTitle}
                              </p>
                            ) : null}
                            {splitLabel ? (
                              <p className="text-xs text-muted-foreground">{splitLabel}</p>
                            ) : null}
                          </td>
                          <td className="py-3 text-muted-foreground">{dateLabel}</td>
                          <td className="py-3 text-muted-foreground">{expense.categoryName}</td>
                          <td className="py-3 pr-3 text-right font-semibold text-rose-500">
                            {formatCurrency(expense.impactAmount, currency)}
                          </td>
                          <td className="py-3 pr-3 text-right text-muted-foreground">
                            {differs ? formatCurrency(expense.amount, currency) : "—"}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => startEdit(expense)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteExpense(expense.id)}
                                disabled={deletingId === expense.id}
                              >
                                {deletingId === expense.id ? "Deleting…" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {editingContext?.anchorId === expense.id ? (
                          <tr>
                            <td colSpan={6} className="pt-0">
                              <div className="rounded-3xl border border-dashed bg-muted/30 p-4 sm:p-6">
                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      Editing {editingContext.items.length} entr
                                      {editingContext.items.length === 1 ? "y" : "ies"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Adjust anything below; saving will replace the selected rows.
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={closeEditor}>
                                    Cancel
                                  </Button>
                                </div>
                                <ExpenseItemBuilder
                                  categories={categories}
                                  suggestions={suggestions}
                                  initialItems={editingItems}
                                  initialGroup={editingContext.group}
                                  submitLabel="Save changes"
                                  disableAutoReset
                                  onSubmitOverride={handleReplace}
                                />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
