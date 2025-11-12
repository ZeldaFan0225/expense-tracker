import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/lib/validation"

const DEFAULT_CATEGORIES = [
  { name: "Housing", color: "#7c3aed" },
  { name: "Food & Dining", color: "#f97316" },
  { name: "Transportation", color: "#06b6d4" },
  { name: "Healthcare", color: "#ef4444" },
  { name: "Entertainment", color: "#a855f7" },
  { name: "Utilities", color: "#22c55e" },
  { name: "Shopping", color: "#facc15" },
  { name: "Travel", color: "#0ea5e9" },
]

export async function ensureDefaultCategories(userId: string) {
  const existing = await prisma.category.count({ where: { userId } })
  if (existing > 0) return

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      userId,
    })),
  })
}

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  })
}

export async function upsertCategory(userId: string, payload: unknown) {
  const data = categorySchema.parse(payload)

  if (data.id) {
    return prisma.category.update({
      where: { id: data.id, userId },
      data: {
        name: data.name,
        color: data.color,
      },
    })
  }

  return prisma.category.create({
    data: {
      name: data.name,
      color: data.color,
      userId,
    },
  })
}

export async function deleteCategory(userId: string, id: string) {
  await prisma.category.delete({
    where: { id, userId },
  })
}
