"use client"

import * as React from "react"
import {useForm} from "react-hook-form"
import {z} from "zod"
import {zodResolver} from "@hookform/resolvers/zod"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {formatCurrency} from "@/lib/currency"
import {useToast} from "@/components/providers/toast-provider"

const dueDayField = z
    .string()
    .min(1)
    .refine((value) => {
        const parsed = Number(value)
        return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31
    }, "Due day must be between 1 and 31")

const formSchema = z.object({
    description: z.string().min(1),
    amount: z.string().min(1),
    dueDayOfMonth: dueDayField,
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
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const {showToast} = useToast()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            amount: "",
            dueDayOfMonth: "1",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const payload = {
            description: values.description,
            amount: Number(values.amount),
            dueDayOfMonth: Number(values.dueDayOfMonth),
        }
        try {
            if (editingId) {
                const response = await fetch(`/api/income/recurring/${editingId}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(payload),
                })
                if (!response.ok) throw new Error("Failed to update template")
                const updated = await response.json()
                setItems((prev) =>
                    prev.map((item) => (item.id === editingId ? updated : item))
                )
                showToast({
                    title: "Recurring income updated",
                    description: updated.description,
                    variant: "success",
                })
            } else {
                const response = await fetch("/api/income/recurring", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(payload),
                })
                if (!response.ok) throw new Error("Failed to create template")
                const template = await response.json()
                setItems((prev) => [template, ...prev])
                showToast({
                    title: "Recurring income added",
                    description: template.description,
                    variant: "success",
                })
            }
            form.reset({
                description: "",
                amount: "",
                dueDayOfMonth: "1",
            })
            setEditingId(null)
        } catch (err) {
            showToast({
                title: editingId ? "Failed to update template" : "Failed to create template",
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

    const formId = "recurring-income-form"

    return (
        <Card className="rounded-3xl">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <CardTitle>Recurring income</CardTitle>
                <div className="flex items-center gap-2">
                    {editingId ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setEditingId(null)
                                form.reset({
                                    description: "",
                                    amount: "",
                                    dueDayOfMonth: "1",
                                })
                            }}
                        >
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
                                : "Create template"}
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
                        <Input {...form.register("description")} />
                    </Field>
                    <Field label="Amount">
                        <Input type="number" step="0.01" {...form.register("amount")} />
                    </Field>
                    <Field label="Due day" error={form.formState.errors.dueDayOfMonth?.message}>
                        <Input type="number" min="1" max="31" {...form.register("dueDayOfMonth")} />
                    </Field>
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
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditingId(item.id)
                                        form.reset({
                                            description: item.description,
                                            amount: item.amount.toString(),
                                            dueDayOfMonth: item.dueDayOfMonth.toString(),
                                        })
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTemplate(item.id)}
                                    disabled={loadingId === item.id}
                                >
                                    Remove
                                </Button>
                            </div>
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
                   error,
               }: {
    label: string
    children: React.ReactNode
    error?: string
}) {
    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            {children}
            {error ? <p className="text-xs text-rose-500">{error}</p> : null}
        </div>
    )
}
