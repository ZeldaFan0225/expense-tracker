import type {Income} from "@prisma/client"
import {prisma} from "@/lib/prisma"
import {decryptNumber, decryptString, encryptNumber, encryptString, serializeEncrypted,} from "@/lib/encryption"
import {incomeSchema, incomeUpdateSchema} from "@/lib/validation"
import {materializeRecurringIncomes} from "@/lib/recurring"

function mapIncome(record: Income) {
    return {
        id: record.id,
        occurredOn: record.occurredOn,
        recurringSourceId: record.recurringSourceId,
        amount: decryptNumber(record.amountEncrypted),
        description: decryptString(record.descriptionEncrypted),
    }
}

export async function addIncome(userId: string, payload: unknown) {
    const data = incomeSchema.parse(payload)
    const created = await prisma.income.create({
        data: {
            userId,
            occurredOn: data.occurredOn,
            amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
            descriptionEncrypted: serializeEncrypted(
                encryptString(data.description)
            ),
        },
    })
    return mapIncome(created)
}

export async function deleteIncome(userId: string, id: string) {
    await prisma.income.delete({
        where: {id, userId},
    })
}

export async function updateIncome(
    userId: string,
    id: string,
    payload: unknown
) {
    if (!id) {
        throw new Error("Income id is required")
    }
    const data = incomeUpdateSchema.parse(payload)

    const updated = await prisma.income.update({
        where: {id, userId},
        data: {
            amountEncrypted:
                data.amount !== undefined
                    ? serializeEncrypted(encryptNumber(data.amount))
                    : undefined,
            descriptionEncrypted:
                data.description !== undefined
                    ? serializeEncrypted(encryptString(data.description))
                    : undefined,
            occurredOn: data.occurredOn,
        },
    })

    return mapIncome(updated)
}

export async function listIncomeForRange(
    userId: string,
    params: { start?: Date; end?: Date } = {}
) {
    await materializeRecurringIncomes(userId)
    const incomes = await prisma.income.findMany({
        where: {
            userId,
            occurredOn: {
                gte: params.start,
                lte: params.end,
            },
        },
        orderBy: {occurredOn: "desc"},
    })
    return incomes.map(mapIncome)
}

export async function getMonthlyIncomeSummary(userId: string, month: Date) {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
    const incomes = await listIncomeForRange(userId, {start, end})

    return incomes.reduce((acc, income) => acc + income.amount, 0)
}

export async function getIncomeHistory(userId: string, months = 6) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1)
    const incomes = await listIncomeForRange(userId, {start, end: now})

    const map = new Map<string, number>()
    for (const income of incomes) {
        const key = `${income.occurredOn.getFullYear()}-${income.occurredOn.getMonth()}`
        map.set(key, (map.get(key) ?? 0) + income.amount)
    }

    return Array.from(map.entries()).map(([key, value]) => {
        const [year, month] = key.split("-").map(Number)
        return {
            month: new Date(year, month, 1),
            amount: value,
        }
    })
}

export async function listMaterializedRecurringIncome(userId: string) {
    const incomes = await prisma.income.findMany({
        where: {
            userId,
            recurringSourceId: {
                not: null,
            },
        },
        orderBy: {occurredOn: "desc"},
    })
    return incomes.map(mapIncome)
}
