import {addMonths, getDaysInMonth, setDate, startOfMonth,} from "date-fns"
import type {Prisma} from "@prisma/client"
import {prisma} from "@/lib/prisma"

function clampToMonth(date: Date, day: number) {
    const monthStart = startOfMonth(date)
    const lastDay = getDaysInMonth(monthStart)
    return setDate(monthStart, Math.min(day, lastDay))
}

function getNextDueDate(lastGenerated: Date | null, dueDay: number) {
    const base = lastGenerated ? addMonths(lastGenerated, 1) : new Date()
    return clampToMonth(base, dueDay)
}

function carryEncrypted(value: Prisma.JsonValue) {
    return value as Prisma.InputJsonValue
}

export async function materializeRecurringExpenses(userId: string) {
    const templates = await prisma.recurringExpense.findMany({
        where: {userId, isActive: true},
    })
    const now = new Date()

    for (const template of templates) {
        let nextDue = getNextDueDate(template.lastGeneratedOn, template.dueDayOfMonth)

        while (nextDue <= now) {
            await prisma.expense.create({
                data: {
                    userId,
                    categoryId: template.categoryId,
                    occurredOn: nextDue,
                    recurringSourceId: template.id,
                    amountEncrypted: carryEncrypted(template.amountEncrypted),
                    splitBy: template.splitBy,
                    descriptionEncrypted: carryEncrypted(template.descriptionEncrypted),
                },
            })

            await prisma.recurringExpense.update({
                where: {id: template.id},
                data: {lastGeneratedOn: nextDue},
            })

            nextDue = clampToMonth(addMonths(nextDue, 1), template.dueDayOfMonth)
        }
    }
}

export async function materializeRecurringIncomes(userId: string) {
    const templates = await prisma.recurringIncome.findMany({
        where: {userId, isActive: true},
    })

    const now = new Date()

    for (const template of templates) {
        let nextDue = getNextDueDate(template.lastGeneratedOn, template.dueDayOfMonth)

        while (nextDue <= now) {
            await prisma.income.create({
                data: {
                    userId,
                    occurredOn: nextDue,
                    recurringSourceId: template.id,
                    amountEncrypted: carryEncrypted(template.amountEncrypted),
                    descriptionEncrypted: carryEncrypted(template.descriptionEncrypted),
                },
            })

            await prisma.recurringIncome.update({
                where: {id: template.id},
                data: {lastGeneratedOn: nextDue},
            })

            nextDue = clampToMonth(addMonths(nextDue, 1), template.dueDayOfMonth)
        }
    }
}
