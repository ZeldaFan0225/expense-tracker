"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/providers/toast-provider"

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  color: z.string().min(1),
})

type Category = {
  id: string
  name: string
  color: string
}

type CategoryManagerProps = {
  categories: Category[]
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [items, setItems] = React.useState(categories)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)
  const { showToast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#0ea5e9",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error("Failed to save category")
      const category = await response.json()
      let updated = false
      setItems((prev) => {
        const exists = prev.some((item) => item.id === category.id)
        updated = exists
        return exists
          ? prev.map((item) => (item.id === category.id ? category : item))
          : [category, ...prev]
      })
      form.reset({
        name: "",
        color: "#0ea5e9",
      })
      showToast({
        title: updated ? "Category updated" : "Category created",
        description: category.name,
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to save category",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteCategory = async (id: string) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete category")
      setItems((prev) => prev.filter((item) => item.id !== id))
      showToast({
        title: "Category deleted",
      })
    } catch (err) {
      showToast({
        title: "Failed to delete category",
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
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-3"
        >
          <Field label="Name">
            <Input {...form.register("name")} placeholder="Benefits" />
          </Field>
          <Field label="Color">
            <Input type="color" {...form.register("color")} />
          </Field>
          <div className="flex items-end justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save category"}
            </Button>
          </div>
        </form>
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-2xl border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <p className="text-sm font-medium">{category.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteCategory(category.id)}
                disabled={loadingId === category.id}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
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
