import {addMonths, endOfDay, formatISO, lastDayOfMonth, startOfDay, subDays,} from "date-fns"
import {prisma} from "@/lib/prisma"
import {decryptNumber, decryptString} from "@/lib/encryption"
import {calculateImpactShare} from "@/lib/expense-shares"

export type DailySummary = Awaited<ReturnType<typeof getDailySummary>>

export async function getDailySummary(userId: string, targetDate = new Date()) {
    const start = startOfDay(targetDate)
    const end = endOfDay(targetDate)

    const [expenses, incomes, recurring, recentExpenseTrend] = await Promise.all([
        prisma.expense.findMany({
            where: {userId, occurredOn: {gte: start, lte: end}},
            include: {category: true, group: true},
            orderBy: {occurredOn: "desc"},
        }),
        prisma.income.findMany({
            where: {userId, occurredOn: {gte: start, lte: end}},
            orderBy: {occurredOn: "desc"},
        }),
        prisma.recurringExpense.findMany({
            where: {userId, isActive: true},
        }),
        prisma.expense.findMany({
            where: {
                userId,
                occurredOn: {
                    gte: startOfDay(subDays(start, 6)),
                    lte: end,
                },
            },
            select: {
                id: true,
                occurredOn: true,
                amountEncrypted: true,
                group: {
                    select: {
                        splitBy: true,
                    },
                },
            },
            orderBy: {occurredOn: "asc"},
        }),
    ])

    const totalExpenses = expenses.reduce((total, expense) => {
        const amount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? 1
        return total + calculateImpactShare(amount, splitBy)
    }, 0)
    const totalIncome = incomes.reduce(
        (total, income) => total + decryptNumber(income.amountEncrypted),
        0
    )

    const expenseDetails = expenses.map((expense) => {
        const amount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? 1
        return {
            id: expense.id,
            occurredOn: expense.occurredOn.toISOString(),
            amount,
            impactAmount: calculateImpactShare(amount, splitBy),
            description: decryptString(expense.descriptionEncrypted),
            category: expense.category?.name ?? null,
            categoryColor: expense.category?.color ?? null,
            splitBy: splitBy > 1 ? splitBy : null,
        }
    })

    const incomeDetails = incomes.map((income) => ({
        id: income.id,
        occurredOn: income.occurredOn.toISOString(),
        amount: decryptNumber(income.amountEncrypted),
        description: decryptString(income.descriptionEncrypted),
    }))

    const dayStart = startOfDay(targetDate)

    function nextDueDate(dueDayOfMonth: number) {
        const thisMonthLast = lastDayOfMonth(dayStart).getDate()
        const currentMonthDay = Math.min(dueDayOfMonth, thisMonthLast)
        const currentMonthDate = new Date(
            dayStart.getFullYear(),
            dayStart.getMonth(),
            currentMonthDay
        )
        if (currentMonthDate >= dayStart) {
            return currentMonthDate
        }
        const nextMonthBase = addMonths(dayStart, 1)
        const nextMonthLast = lastDayOfMonth(nextMonthBase).getDate()
        const nextDay = Math.min(dueDayOfMonth, nextMonthLast)
        return new Date(
            nextMonthBase.getFullYear(),
            nextMonthBase.getMonth(),
            nextDay
        )
    }

    const upcomingRecurring = recurring
        .map((template) => ({
            id: template.id,
            description: decryptString(template.descriptionEncrypted),
            amount: decryptNumber(template.amountEncrypted),
            dueDayOfMonth: template.dueDayOfMonth,
            categoryId: template.categoryId,
            nextDue: nextDueDate(template.dueDayOfMonth),
        }))
        .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
        .slice(0, 4)
        .map(({nextDue, ...rest}) => rest)

    const expenseTrend = recentExpenseTrend.map((expense) => {
        const amount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? 1
        return {
            id: expense.id,
            occurredOn: expense.occurredOn.toISOString(),
            impactAmount: calculateImpactShare(amount, splitBy),
        }
    })

    return {
        date: formatISO(start, {representation: "date"}),
        totals: {
            expenses: totalExpenses,
            income: totalIncome,
            net: totalIncome - totalExpenses,
        },
        expenses: expenseDetails.slice(0, 5),
        incomes: incomeDetails.slice(0, 3),
        upcomingRecurring,
        trend: expenseTrend,
    }
}
