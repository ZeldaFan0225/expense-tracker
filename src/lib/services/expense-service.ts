import type { Category, Expense, ExpenseGroup } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  bulkExpenseSchema,
  expenseSchema,
} from "@/lib/validation"
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  serializeEncrypted,
} from "@/lib/encryption"
import { materializeRecurringExpenses } from "@/lib/recurring"

type ExpenseWithRelations = Expense & {
  category: Category | null
  group: ExpenseGroup | null
}

function resolveImpactAmount(
  amount: number,
  providedImpact: number | undefined,
  splitBy?: number | null
) {
  if (typeof providedImpact === "number") {
    return providedImpact
  }
  if (splitBy && splitBy > 1) {
    return amount / splitBy
  }
  return amount
}

function mapExpense(record: ExpenseWithRelations) {
  return {
    id: record.id,
    occurredOn: record.occurredOn,
    category: record.category,
    recurringSourceId: record.recurringSourceId,
    amount: decryptNumber(record.amountEncrypted),
    impactAmount: decryptNumber(record.impactAmountEncrypted),
    description: decryptString(record.descriptionEncrypted),
    group: record.group
      ? {
          id: record.group.id,
          title: decryptString(record.group.titleEncrypted),
          notes: decryptString(record.group.notesEncrypted),
          splitBy: record.group.splitBy,
        }
      : null,
  }
}

export async function listExpenses(
  userId: string,
  params: { start?: Date; end?: Date; take?: number } = {}
) {
  await materializeRecurringExpenses(userId)
  const { start, end, take = 200 } = params
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      occurredOn: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { occurredOn: "desc" },
    take,
    include: {
      category: true,
      group: true,
    },
  })

  return expenses.map(mapExpense)
}

export async function getExpense(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true, group: true },
  })
  if (!expense) return null
  return mapExpense(expense)
}

export async function createExpense(userId: string, payload: unknown) {
  const data = expenseSchema.parse(payload)
  const created = await prisma.expense.create({
    data: {
      userId,
      occurredOn: data.occurredOn,
      categoryId: data.categoryId,
      amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
      impactAmountEncrypted: serializeEncrypted(
        encryptNumber(data.impactAmount ?? data.amount)
      ),
      descriptionEncrypted: serializeEncrypted(
        encryptString(data.description)
      ),
    },
    include: { category: true, group: true },
  })
  return mapExpense(created)
}

export async function updateExpense(userId: string, id: string, payload: unknown) {
  const data = expenseSchema.partial().parse(payload)

  await prisma.expense.findFirstOrThrow({
    where: { id, userId },
  })

  const updated = await prisma.expense.update({
    where: { id, userId },
    data: {
      occurredOn: data.occurredOn,
      categoryId: data.categoryId,
      amountEncrypted:
        data.amount !== undefined
          ? serializeEncrypted(encryptNumber(data.amount))
          : undefined,
      impactAmountEncrypted:
        data.impactAmount !== undefined
          ? serializeEncrypted(encryptNumber(data.impactAmount))
          : undefined,
      descriptionEncrypted: data.description
        ? serializeEncrypted(encryptString(data.description))
        : undefined,
    },
    include: {
      category: true,
      group: true,
    },
  })

  return mapExpense(updated)
}

export async function deleteExpense(userId: string, id: string) {
  await prisma.expense.delete({
    where: { id, userId },
  })
}

export async function bulkCreateExpenses(userId: string, payload: unknown) {
  const data = bulkExpenseSchema.parse(payload)

  if (!data.items.length) return []

  const pendingSplitBy = data.group?.splitBy ?? 1

  const group = data.group
    ? await prisma.expenseGroup.create({
        data: {
          userId,
          splitBy: data.group.splitBy,
          titleEncrypted: serializeEncrypted(
            encryptString(data.group.title)
          ),
          notesEncrypted: data.group.notes
            ? serializeEncrypted(encryptString(data.group.notes))
            : undefined,
        },
      })
    : null

  const created = await prisma.$transaction(
    data.items.map((item) =>
      prisma.expense.create({
        data: {
          userId,
          occurredOn: item.occurredOn,
          categoryId: item.categoryId,
          groupId: group?.id,
          amountEncrypted: serializeEncrypted(encryptNumber(item.amount)),
          impactAmountEncrypted: serializeEncrypted(
            encryptNumber(
              resolveImpactAmount(item.amount, item.impactAmount, pendingSplitBy)
            )
          ),
          descriptionEncrypted: serializeEncrypted(
            encryptString(item.description)
          ),
        },
        include: { category: true, group: true },
      })
    )
  )

  return created.map(mapExpense)
}

export async function replaceExpenses(
  userId: string,
  expenseIds: string[],
  payload: unknown
) {
  if (!expenseIds.length) {
    throw new Error("No expenses selected")
  }

  const data = bulkExpenseSchema.parse(payload)

  const existing = await prisma.expense.findMany({
    where: { userId, id: { in: expenseIds } },
    select: { id: true, groupId: true },
  })

  if (existing.length !== expenseIds.length) {
    throw new Error("Some expenses were not found")
  }

  const groupIds = Array.from(
    new Set(existing.map((expense) => expense.groupId).filter(Boolean))
  ) as string[]

  const results = await prisma.$transaction(async (tx) => {
    await tx.expense.deleteMany({
      where: { userId, id: { in: expenseIds } },
    })

    for (const groupId of groupIds) {
      const remaining = await tx.expense.count({ where: { groupId } })
      if (remaining === 0) {
        await tx.expenseGroup.delete({ where: { id: groupId, userId } })
      }
    }

    const group = data.group
      ? await tx.expenseGroup.create({
          data: {
            userId,
            splitBy: data.group.splitBy,
            titleEncrypted: serializeEncrypted(
              encryptString(data.group.title ?? "")
            ),
            notesEncrypted: data.group.notes
              ? serializeEncrypted(encryptString(data.group.notes))
              : undefined,
          },
        })
      : null

    const created = await Promise.all(
      data.items.map((item) =>
        tx.expense.create({
          data: {
            userId,
            occurredOn: item.occurredOn,
            categoryId: item.categoryId,
            groupId: group?.id,
            amountEncrypted: serializeEncrypted(encryptNumber(item.amount)),
            impactAmountEncrypted: serializeEncrypted(
              encryptNumber(item.impactAmount ?? item.amount)
            ),
            descriptionEncrypted: serializeEncrypted(
              encryptString(item.description)
            ),
          },
          include: { category: true, group: true },
        })
      )
    )

    return created.map(mapExpense)
  })

  return results
}

export async function summarizeExpenses(userId: string, start: Date, end: Date) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      occurredOn: { gte: start, lte: end },
    },
  })

  return expenses.reduce(
    (acc, expense) => acc + decryptNumber(expense.impactAmountEncrypted),
    0
  )
}

export async function getExpenseSuggestions(userId: string, take = 5) {
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { occurredOn: "desc" },
    take: 50,
  })

  const uniqueDescriptions = Array.from(
    new Set(expenses.map((expense) => decryptString(expense.descriptionEncrypted)))
  )

  return uniqueDescriptions.slice(0, take)
}

export async function suggestCategoryForDescription(
  userId: string,
  description: string
) {
  const normalized = description.toLowerCase().trim()
  if (!normalized) return null

  const expenses = await prisma.expense.findMany({
    where: { userId, categoryId: { not: null } },
    include: { category: true },
    orderBy: { occurredOn: "desc" },
    take: 200,
  })

  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (!tokens.length) return null

  let best: { categoryId: string; categoryName: string; score: number } | null = null
  for (const expense of expenses) {
    if (!expense.category) continue
    const descriptionText = decryptString(expense.descriptionEncrypted).toLowerCase()
    const descriptionTokens = descriptionText.split(/\s+/)
    let score = 0
    for (const token of tokens) {
      if (descriptionTokens.includes(token)) score += 2
      if (descriptionText.startsWith(token)) score += 1
      if (descriptionText.includes(token)) score += 0.5
    }
    if (!best || score > best.score) {
      best = {
        categoryId: expense.category.id,
        categoryName: expense.category.name,
        score,
      }
    }
  }

  return best
}
