import {prisma} from "@/lib/prisma"
import {decryptNumber, decryptString} from "@/lib/encryption"
import {calculateImpactShare} from "@/lib/expense-shares"

export type FeedEvent = {
    id: string
    type:
        | "expense"
        | "expense-group"
        | "income"
        | "recurring-expense"
        | "recurring-income"
        | "api-key"
        | "import-schedule"
    title: string
    subtitle?: string
    timestamp: Date
    createdAt?: Date
    amount?: number
    actualAmount?: number
    splitBy?: number
    recurringSourceId?: string
    category?: string
    items?: Array<{
        id: string
        title: string
        category?: string
        amount?: number
        actualAmount?: number
    }>
}

const FINANCIAL_FEED_TYPES: FeedEvent["type"][] = ["expense", "expense-group", "income"]
const AUTOMATION_FEED_TYPES: FeedEvent["type"][] = [
    "recurring-expense",
    "recurring-income",
    "api-key",
    "import-schedule",
]

type FeedOptions = {
    includeTypes?: FeedEvent["type"][]
}

export async function getActivityFeed(userId: string, take = 40, options?: FeedOptions) {
    const importSchedulesPromise =
        typeof (prisma as any).importSchedule?.findMany === "function"
            ? (prisma as any).importSchedule.findMany({
                where: {userId},
                orderBy: {updatedAt: "desc"},
                take: 10,
            })
            : Promise.resolve([])

    const [expenses, incomes, recurringExpenses, recurringIncomes, apiKeys, importSchedules] =
        await Promise.all([
            prisma.expense.findMany({
                where: {userId},
                include: {category: true, group: true},
                orderBy: [{occurredOn: "desc"}, {createdAt: "desc"}],
                take,
            }),
            prisma.income.findMany({
                where: {userId},
                orderBy: [{occurredOn: "desc"}, {createdAt: "desc"}],
                take,
            }),
            prisma.recurringExpense.findMany({
                where: {userId},
                include: {category: true},
                orderBy: {updatedAt: "desc"},
                take: 10,
            }),
            prisma.recurringIncome.findMany({
                where: {userId},
                orderBy: {updatedAt: "desc"},
                take: 10,
            }),
            prisma.apiKey.findMany({
                where: {userId},
                orderBy: {createdAt: "desc"},
                take: 10,
            }),
            importSchedulesPromise,
        ])

    const feed: FeedEvent[] = []

    type GroupBucket = {
        id: string
        title: string
        notes?: string
        timestamp: Date
        createdAt?: Date
        totalImpact: number
        totalActual: number
        splitBy?: number
        items: Array<{
            id: string
            title: string
            category?: string
            amount: number
            actualAmount: number
        }>
    }

    const groupBuckets = new Map<string, GroupBucket>()

    for (const expense of expenses) {
        const description = decryptString(expense.descriptionEncrypted)
        const actualAmount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? (expense.splitBy ?? 1)
        const impactAmount = calculateImpactShare(actualAmount, splitBy)
        const categoryName = expense.category?.name ?? "Uncategorized"

        if (expense.groupId && expense.group) {
            const groupId = expense.groupId
            let bucket = groupBuckets.get(groupId)
            if (!bucket) {
                const title = decryptString(expense.group.titleEncrypted)
                const notes = expense.group.notesEncrypted
                    ? decryptString(expense.group.notesEncrypted)
                    : undefined
                bucket = {
                    id: groupId,
                    title: title || "Grouped expenses",
                    notes,
                    timestamp: expense.occurredOn,
                    createdAt: expense.createdAt,
                    totalImpact: 0,
                    totalActual: 0,
                    splitBy: expense.group?.splitBy ?? undefined,
                    items: [],
                }
                groupBuckets.set(groupId, bucket)
            }

            bucket.items.push({
                id: expense.id,
                title: description,
                category: categoryName,
                amount: impactAmount,
                actualAmount,
            })
            bucket.totalImpact += impactAmount
            bucket.totalActual += actualAmount
            if (expense.occurredOn > bucket.timestamp) {
                bucket.timestamp = expense.occurredOn
            }
            if (!bucket.createdAt || expense.createdAt > bucket.createdAt) {
                bucket.createdAt = expense.createdAt
            }
        } else {
            feed.push({
                id: expense.id,
                type: "expense",
                title: description,
                subtitle: categoryName,
                amount: impactAmount,
                actualAmount,
                splitBy: splitBy > 1 ? splitBy : undefined,
                category: categoryName,
                timestamp: expense.occurredOn,
                createdAt: expense.createdAt,
            })
        }
    }

    for (const bucket of groupBuckets.values()) {
        feed.push({
            id: `group-${bucket.id}`,
            type: "expense-group",
            title: bucket.title,
            subtitle: bucket.notes
                ? `${bucket.items.length} items · ${bucket.notes}`
                : `${bucket.items.length} items`,
            amount: bucket.totalImpact,
            actualAmount: bucket.totalActual,
            splitBy: bucket.splitBy,
            timestamp: bucket.timestamp,
            createdAt: bucket.createdAt,
            items: bucket.items,
        })
    }

    for (const income of incomes) {
        const amount = decryptNumber(income.amountEncrypted)
        const isRecurringInstance = Boolean(income.recurringSourceId)
        feed.push({
            id: income.id,
            type: "income",
            title: decryptString(income.descriptionEncrypted),
            subtitle: isRecurringInstance ? "Recurring income" : undefined,
            amount,
            actualAmount: amount,
            recurringSourceId: income.recurringSourceId ?? undefined,
            timestamp: income.occurredOn,
            createdAt: income.createdAt,
        })
    }

    for (const template of recurringExpenses) {
        feed.push({
            id: template.id,
            type: "recurring-expense",
            title: decryptString(template.descriptionEncrypted),
            subtitle: template.category?.name ?? "Uncategorized",
            amount: decryptNumber(template.amountEncrypted),
            timestamp: template.updatedAt,
            createdAt: template.updatedAt,
        })
    }

    for (const template of recurringIncomes) {
        feed.push({
            id: template.id,
            type: "recurring-income",
            title: decryptString(template.descriptionEncrypted),
            amount: decryptNumber(template.amountEncrypted),
            timestamp: template.updatedAt,
            createdAt: template.updatedAt,
        })
    }

    for (const key of apiKeys) {
        feed.push({
            id: key.id,
            type: "api-key",
            title: key.description ?? `API key ${key.prefix}`,
            subtitle: key.scopes.join(", "),
            timestamp: key.createdAt,
            createdAt: key.createdAt,
        })
    }

    for (const schedule of importSchedules) {
        feed.push({
            id: schedule.id,
            type: "import-schedule",
            title: schedule.name,
            subtitle: `${schedule.mode} · ${schedule.frequency}`,
            timestamp: schedule.updatedAt,
            createdAt: schedule.updatedAt,
        })
    }

    const includeTypes = options?.includeTypes?.length
        ? new Set(options.includeTypes)
        : null

    function eventSortKey(event: FeedEvent) {
        const dayKey = event.timestamp
        const timeKey = event.createdAt ?? event.timestamp
        return {dayKey, timeKey}
    }

    return feed
        .sort((a, b) => {
            const aKey = eventSortKey(a)
            const bKey = eventSortKey(b)

            const dayDiff =
                bKey.dayKey.setHours(0, 0, 0, 0) - aKey.dayKey.setHours(0, 0, 0, 0)
            if (dayDiff !== 0) return dayDiff

            return bKey.timeKey.getTime() - aKey.timeKey.getTime()
        })
        .filter((event) => (includeTypes ? includeTypes.has(event.type) : true))
        .slice(0, take)
}

export async function getFinancialActivityFeed(userId: string, take = 40) {
    return getActivityFeed(userId, take, {includeTypes: FINANCIAL_FEED_TYPES})
}

export async function getAutomationActivityFeed(userId: string, take = 40) {
    return getActivityFeed(userId, take, {includeTypes: AUTOMATION_FEED_TYPES})
}
