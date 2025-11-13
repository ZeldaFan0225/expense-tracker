"use client"

import * as React from "react"
import {format} from "date-fns"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {formatCurrency} from "@/lib/currency"
import {useToast} from "@/components/providers/toast-provider"

import Link from "next/link"

type IncomeRow = {
    id: string
    description: string
    occurredOn: Date
    amount: number
    recurringSourceId: string | null
}

type RecurringIncomeLogProps = {
    initialIncomes: IncomeRow[]
    currency: string
}

function sortIncomes(rows: IncomeRow[]) {
    return [...rows].sort(
        (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()
    )
}

export function RecurringIncomeLog({initialIncomes, currency}: RecurringIncomeLogProps) {
    const {showToast} = useToast()
    const [incomes, setIncomes] = React.useState(() => sortIncomes(initialIncomes))
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [editingId, setEditingId] = React.useState<string | null>(null)

    const deleteIncome = async (id: string) => {
        const target = incomes.find((income) => income.id === id)
        if (!target) return

        const confirmed = window.confirm(
            `Delete "${target.description}" from ${format(new Date(target.occurredOn), "MMM d, yyyy")}?`
        )
        if (!confirmed) return

        setDeletingId(id)
        try {
            const response = await fetch(`/api/income/${id}`, {method: "DELETE"})
            if (!response.ok) {
                throw new Error("Failed to delete income")
            }
            setIncomes((prev) => prev.filter((income) => income.id !== id))
            showToast({
                title: "Income deleted",
                description: target.description,
            })
        } catch (error) {
            showToast({
                title: "Unable to delete income",
                description: error instanceof Error ? error.message : "Try again shortly",
                variant: "destructive",
            })
        } finally {
            setDeletingId(null)
        }
    }

    const handleUpdate = (updatedIncome: IncomeRow) => {
        setIncomes((prev) => {
            const newIncomes = prev.map((income) =>
                income.id === updatedIncome.id ? updatedIncome : income
            )
            return sortIncomes(newIncomes)
        })
        setEditingId(null)
    }

    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <CardTitle>Recurring Income Log</CardTitle>
            </CardHeader>
            <CardContent>
                {incomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recurring income has been posted yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead className="text-left text-muted-foreground">
                            <tr>
                                <th className="pb-2 font-medium">Description</th>
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                                <th className="pb-2 text-right font-medium">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {incomes.map((income) => {
                                const dateLabel = format(new Date(income.occurredOn), "MMM d, yyyy")
                                return (
                                    <React.Fragment key={income.id}>
                                        <tr className="align-middle">
                                            <td className="py-3">
                                                <p className="font-medium text-foreground">{income.description}</p>
                                                {income.recurringSourceId ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        <Link href="/income" className="underline">
                                                            Recurring income
                                                        </Link>
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="py-3 text-muted-foreground">{dateLabel}</td>
                                            <td className="py-3 pr-3 text-right font-semibold text-emerald-500">
                                                {formatCurrency(income.amount, currency)}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setEditingId(income.id)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => deleteIncome(income.id)}
                                                        disabled={deletingId === income.id}
                                                    >
                                                        {deletingId === income.id ? "Deleting…" : "Delete"}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {editingId === income.id && (
                                            <tr>
                                                <td colSpan={4} className="pt-0">
                                                    <div
                                                        className="rounded-3xl border border-dashed bg-muted/30 p-4 sm:p-6 my-4">
                                                        <EditIncomeForm
                                                            income={income}
                                                            onCancel={() => setEditingId(null)}
                                                            onUpdate={handleUpdate}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function EditIncomeForm({
                            income,
                            onCancel,
                            onUpdate,
                        }: {
    income: IncomeRow
    onCancel: () => void
    onUpdate: (income: IncomeRow) => void
}) {
    const {showToast} = useToast()
    const [description, setDescription] = React.useState(income.description)
    const [amount, setAmount] = React.useState(income.amount.toString())
    const [occurredOn, setOccurredOn] = React.useState(
        format(new Date(income.occurredOn), "yyyy-MM-dd")
    )
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsSubmitting(true)
        try {
            const payload = {
                description,
                amount: Number(amount),
                occurredOn: new Date(occurredOn),
            }
            const response = await fetch(`/api/income/${income.id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            })
            if (!response.ok) {
                throw new Error("Failed to update income")
            }
            const updatedIncome = await response.json()
            onUpdate({
                ...updatedIncome,
                occurredOn: new Date(updatedIncome.occurredOn),
            })
            showToast({
                title: "Income updated",
                variant: "success",
            })
        } catch (error) {
            showToast({
                title: "Unable to update income",
                description: error instanceof Error ? error.message : "Try again shortly",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                        type="date"
                        value={occurredOn}
                        onChange={(e) => setOccurredOn(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
