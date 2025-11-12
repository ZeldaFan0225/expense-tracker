import type {Prisma, RecurringIncome} from "@prisma/client"
import {prisma} from "@/lib/prisma"
import {decryptNumber, decryptString, encryptNumber, encryptString, serializeEncrypted,} from "@/lib/encryption"
import {recurringIncomeSchema, recurringIncomeUpdateSchema,} from "@/lib/validation"

function mapTemplate(template: RecurringIncome) {
    return {
        id: template.id,
        dueDayOfMonth: template.dueDayOfMonth,
        isActive: template.isActive,
        lastGeneratedOn: template.lastGeneratedOn,
        amount: decryptNumber(template.amountEncrypted),
        description: decryptString(template.descriptionEncrypted),
    }
}

export async function listRecurringIncomes(userId: string) {
    const templates = await prisma.recurringIncome.findMany({
        where: {userId},
        orderBy: {createdAt: "desc"},
    })
    return templates.map(mapTemplate)
}

export async function createRecurringIncome(userId: string, payload: unknown) {
    const data = recurringIncomeSchema.parse(payload)
    const created = await prisma.recurringIncome.create({
        data: {
            userId,
            dueDayOfMonth: data.dueDayOfMonth,
            amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
            descriptionEncrypted: serializeEncrypted(
                encryptString(data.description)
            ),
        },
    })
    return mapTemplate(created)
}

export async function updateRecurringIncome(
    userId: string,
    id: string,
    payload: unknown
) {
    if (!id) {
        throw new Error("Recurring income id is required")
    }
    const data = recurringIncomeUpdateSchema.parse(payload)
    const existing = await prisma.recurringIncome.findFirstOrThrow({
        where: {id, userId},
    })

    const updates: Prisma.RecurringIncomeUpdateInput = {}

    if (data.dueDayOfMonth !== undefined) {
        updates.dueDayOfMonth = data.dueDayOfMonth
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

    const result = await prisma.recurringIncome.updateMany({
        where: {id, userId},
        data: updates,
    })
    if (result.count === 0) {
        throw new Error("Recurring income not found")
    }
    const fresh = await prisma.recurringIncome.findFirstOrThrow({
        where: {id, userId},
    })
    return mapTemplate(fresh)
}

export async function deleteRecurringIncome(userId: string, id: string) {
    if (!id) {
        throw new Error("Recurring income id is required")
    }
    await prisma.recurringIncome.findFirstOrThrow({
        where: {id, userId},
    })
    await prisma.recurringIncome.delete({
        where: {id},
    })
}
