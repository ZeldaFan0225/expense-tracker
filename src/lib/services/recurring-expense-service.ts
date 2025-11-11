import type { Prisma, RecurringExpense } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  serializeEncrypted,
} from "@/lib/encryption"
import {
  recurringExpenseSchema,
  recurringExpenseUpdateSchema,
} from "@/lib/validation"

function mapTemplate(template: RecurringExpense) {
  return {
    id: template.id,
    categoryId: template.categoryId,
    dueDayOfMonth: template.dueDayOfMonth,
    splitBy: template.splitBy,
    isActive: template.isActive,
    lastGeneratedOn: template.lastGeneratedOn,
    amount: decryptNumber(template.amountEncrypted),
    description: decryptString(template.descriptionEncrypted),
  }
}

export async function listRecurringExpenses(userId: string) {
  const templates = await prisma.recurringExpense.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return templates.map(mapTemplate)
}

export async function createRecurringExpense(userId: string, payload: unknown) {
  const data = recurringExpenseSchema.parse(payload)
  const created = await prisma.recurringExpense.create({
    data: {
      userId,
      categoryId: data.categoryId,
      dueDayOfMonth: data.dueDayOfMonth,
      splitBy: data.splitBy,
      amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
      descriptionEncrypted: serializeEncrypted(
        encryptString(data.description)
      ),
    },
  })
  return mapTemplate(created)
}

export async function updateRecurringExpense(
  userId: string,
  id: string,
  payload: unknown
) {
  if (!id) {
    throw new Error("Recurring expense id is required")
  }
  const data = recurringExpenseUpdateSchema.parse(payload)
  const existing = await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })

  const updates: Prisma.RecurringExpenseUpdateInput = {}

  if (data.categoryId !== undefined) {
    updates.categoryId = data.categoryId
  }
  if (data.dueDayOfMonth !== undefined) {
    updates.dueDayOfMonth = data.dueDayOfMonth
  }
  if (data.splitBy !== undefined) {
    updates.splitBy = data.splitBy
  }
  if (data.amount !== undefined) {
    updates.amountEncrypted = serializeEncrypted(encryptNumber(data.amount))
  }
  if (data.description !== undefined) {
    updates.descriptionEncrypted = serializeEncrypted(
      encryptString(data.description)
    )
  }
  if (data.isActive !== undefined) {
    updates.isActive = data.isActive
  }

  if (Object.keys(updates).length === 0) {
    return mapTemplate(existing)
  }

  const result = await prisma.recurringExpense.updateMany({
    where: { id, userId },
    data: updates,
  })
  if (result.count === 0) {
    throw new Error("Recurring expense not found")
  }
  const fresh = await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  return mapTemplate(fresh)
}

export async function toggleRecurringExpense(userId: string, id: string) {
  if (!id) {
    throw new Error("Recurring expense id is required")
  }
  const template = await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  const result = await prisma.recurringExpense.updateMany({
    where: { id, userId },
    data: { isActive: !template.isActive },
  })
  if (result.count === 0) {
    throw new Error("Recurring expense not found")
  }
  const fresh = await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  return mapTemplate(fresh)
}

export async function deleteRecurringExpense(userId: string, id: string) {
  if (!id) {
    throw new Error("Recurring expense id is required")
  }
  await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  await prisma.recurringExpense.delete({
    where: { id },
  })
}
