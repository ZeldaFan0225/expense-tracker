import {eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths,} from "date-fns"
import {prisma} from "@/lib/prisma"
import {listExpenses} from "@/lib/services/expense-service"
import {listRecurringExpenses} from "@/lib/services/recurring-expense-service"
import {ensureDefaultCategories, listCategories} from "@/lib/services/category-service"
import {getMonthlyOverview} from "@/lib/services/analytics-service"
import {decryptNumber} from "@/lib/encryption"
import {calculateImpactShare} from "@/lib/expense-shares"

export async function getMonthlyCashHistory(userId: string, months = 6) {
    const now = new Date()
    const start = startOfMonth(subMonths(now, months - 1))
    const end = endOfMonth(now)

    const [expenses, incomes] = await Promise.all([
        prisma.expense.findMany({
            where: {userId, occurredOn: {gte: start, lte: end}},
            include: {group: true},
        }),
        prisma.income.findMany({
            where: {userId, occurredOn: {gte: start, lte: end}},
        }),
    ])

    const monthsRange = eachMonthOfInterval({start, end})
    const series = monthsRange.map((month) => {
        const key = `${month.getFullYear()}-${month.getMonth()}`
        const expenseTotal = expenses
            .filter((expense) => `${expense.occurredOn.getFullYear()}-${expense.occurredOn.getMonth()}` === key)
            .reduce((acc, expense) => {
                const amount = decryptNumber(expense.amountEncrypted)
                const splitBy = expense.group?.splitBy ?? 1
                return acc + calculateImpactShare(amount, splitBy)
            }, 0)

        const incomeTotal = incomes
            .filter((income) => `${income.occurredOn.getFullYear()}-${income.occurredOn.getMonth()}` === key)
            .reduce((acc, income) => acc + decryptNumber(income.amountEncrypted), 0)

        return {
            label: format(month, "MMM"),
            income: incomeTotal,
            expenses: expenseTotal,
        }
    })

    return series
}

export async function getDashboardData(userId: string) {
    await ensureDefaultCategories(userId)

    const [overview, recentExpenses, categories, recurring, cashHistory, apiKeyCount] =
        await Promise.all([
            getMonthlyOverview(userId),
            listExpenses(userId, {take: 5}),
            listCategories(userId),
            listRecurringExpenses(userId),
            getMonthlyCashHistory(userId),
            prisma.apiKey.count({where: {userId}}),
        ])

    return {
        overview,
        recentExpenses,
        categories,
        recurringExpenses: recurring.slice(0, 5),
        cashHistory,
        apiKeyCount,
    }
}
