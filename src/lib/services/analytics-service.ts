import {
  addMonths,
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns"
import { prisma } from "@/lib/prisma"
import { decryptNumber, decryptString } from "@/lib/encryption"

export type RangePreset =
  | "month"
  | "3m"
  | "6m"
  | "12m"
  | "ytd"
  | "custom"

function resolveRange(params?: {
  preset?: RangePreset
  start?: Date
  end?: Date
}) {
  const now = new Date()
  const preset = params?.preset ?? "6m"

  if (preset === "custom" && params?.start && params?.end) {
    return {
      preset,
      start: params.start,
      end: params.end,
    }
  }

  if (preset === "month") {
    return {
      preset,
      start: startOfMonth(now),
      end: endOfMonth(now),
    }
  }

  if (preset === "3m") {
    return {
      preset,
      start: startOfMonth(subMonths(now, 2)),
      end: endOfMonth(now),
    }
  }

  if (preset === "6m") {
    return {
      preset,
      start: startOfMonth(subMonths(now, 5)),
      end: endOfMonth(now),
    }
  }

  if (preset === "12m") {
    return {
      preset,
      start: startOfMonth(subMonths(now, 11)),
      end: endOfMonth(now),
    }
  }

  if (preset === "ytd") {
    return {
      preset,
      start: startOfYear(now),
      end: endOfMonth(now),
    }
  }

  return {
    preset: "6m" as const,
    start: startOfMonth(subMonths(now, 5)),
    end: endOfMonth(now),
  }
}

function monthKey(date: Date) {
  return format(date, "yyyy-MM")
}

function ensureCategoryDescriptor(expense: {
  category: { id: string; name: string; color: string } | null
}) {
  if (expense.category) {
    return {
      id: expense.category.id,
      label: expense.category.name,
      color: expense.category.color,
    }
  }

  return {
    id: "uncategorized",
    label: "Uncategorized",
    color: "#94a3b8",
  }
}

function calculateStats(values: number[]) {
  if (!values.length) return { mean: 0, std: 0 }
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length
  const variance =
    values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    values.length
  return { mean, std: Math.sqrt(variance) }
}

export async function getMonthlyOverview(
  userId: string,
  month: Date = new Date()
) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, occurredOn: { gte: start, lte: end } },
      include: { category: true },
    }),
    prisma.income.findMany({
      where: { userId, occurredOn: { gte: start, lte: end } },
    }),
  ])

  const totalExpenses = expenses.reduce(
    (acc, expense) => acc + decryptNumber(expense.impactAmountEncrypted),
    0
  )
  const totalIncome = incomes.reduce(
    (acc, income) => acc + decryptNumber(income.amountEncrypted),
    0
  )

  const categoryTotals = expenses.reduce<
    Record<
      string,
      {
        id: string
        label: string
        color: string
        value: number
      }
    >
  >((acc, expense) => {
    const descriptor = ensureCategoryDescriptor(expense)
    const key = descriptor.id
    acc[key] = acc[key] || {
      id: descriptor.id,
      label: descriptor.label,
      color: descriptor.color,
      value: 0,
    }
    acc[key].value += decryptNumber(expense.impactAmountEncrypted)
    return acc
  }, {})

  return {
    start,
    end,
    totalExpenses,
    totalIncome,
    remainingBudget: totalIncome - totalExpenses,
    categoryTotals: Object.values(categoryTotals),
  }
}

export async function getAvailableBalanceSeries(
  userId: string,
  params?: { preset?: RangePreset; start?: Date; end?: Date }
) {
  const range = resolveRange(params)
  const months = eachMonthOfInterval({
    start: startOfMonth(range.start),
    end: startOfMonth(range.end),
  })

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        occurredOn: { gte: range.start, lte: range.end },
      },
    }),
    prisma.income.findMany({
      where: {
        userId,
        occurredOn: { gte: range.start, lte: range.end },
      },
    }),
  ])

  const expenseByMonth = expenses.reduce<Record<string, number>>(
    (acc, expense) => {
      const key = monthKey(expense.occurredOn)
      acc[key] =
        (acc[key] ?? 0) + decryptNumber(expense.impactAmountEncrypted)
      return acc
    },
    {}
  )

  const incomeByMonth = incomes.reduce<Record<string, number>>(
    (acc, income) => {
      const key = monthKey(income.occurredOn)
      acc[key] = (acc[key] ?? 0) + decryptNumber(income.amountEncrypted)
      return acc
    },
    {}
  )

  let runningBalance = 0
  const series = months.map((month) => {
    const key = monthKey(month)
    const monthIncome = incomeByMonth[key] ?? 0
    const monthExpenses = expenseByMonth[key] ?? 0
    runningBalance += monthIncome - monthExpenses

    return {
      key,
      label: format(month, "MMM yyyy"),
      income: monthIncome,
      expenses: monthExpenses,
      balance: runningBalance,
    }
  })

  return { range, series }
}

export async function getPeriodComparison(userId: string) {
  const currentMonth = new Date()
  const previousMonth = subMonths(currentMonth, 1)

  const [current, previous] = await Promise.all([
    getMonthlyOverview(userId, currentMonth),
    getMonthlyOverview(userId, previousMonth),
  ])

  return {
    current,
    previous,
    deltas: {
      income: current.totalIncome - previous.totalIncome,
      expenses: current.totalExpenses - previous.totalExpenses,
      remaining: current.remainingBudget - previous.remainingBudget,
    },
  }
}

export async function exportSpendingCsv(
  userId: string,
  params?: { start?: Date; end?: Date }
) {
  const { start, end } = resolveRange({
    preset: params?.start && params?.end ? "custom" : "month",
    start: params?.start,
    end: params?.end,
  })

  const expenses = await prisma.expense.findMany({
    where: { userId, occurredOn: { gte: start, lte: end } },
    include: { category: true },
    orderBy: { occurredOn: "desc" },
  })

  const rows = [
    "date,description,category,amount,impactAmount",
    ...expenses.map((expense) =>
      [
        expense.occurredOn.toISOString(),
        `"${decryptString(expense.descriptionEncrypted).replace(/"/g, '""')}"`,
        expense.category?.name ?? "Uncategorized",
        decryptNumber(expense.amountEncrypted).toFixed(2),
        decryptNumber(expense.impactAmountEncrypted).toFixed(2),
      ].join(",")
    ),
  ]

  return rows.join("\n")
}

export async function getForecast(
  userId: string,
  options: { months?: number; horizon?: number } = {}
) {
  const months = options.months ?? 12
  const horizon = options.horizon ?? 3
  const now = new Date()
  const start = startOfMonth(subMonths(now, months - 1))
  const end = endOfMonth(now)
  const { series } = await getAvailableBalanceSeries(userId, {
    preset: "custom",
    start,
    end,
  })

  const history = series.map((point) => ({
    ...point,
    net: point.income - point.expenses,
  }))

  const window = Math.min(3, history.length)
  const recent = history.slice(-window)
  const movingAverage =
    recent.length === 0
      ? 0
      : recent.reduce((acc, item) => acc + item.net, 0) / recent.length

  const forecastPoints: Array<{ key: string; label: string; forecast: number }> = []
  let cursor = startOfMonth(now)
  let projectedNet = movingAverage

  for (let i = 1; i <= horizon; i++) {
    cursor = addMonths(cursor, 1)
    forecastPoints.push({
      key: monthKey(cursor),
      label: format(cursor, "MMM yyyy"),
      forecast: Number(projectedNet.toFixed(2)),
    })
  }

  return {
    history,
    forecast: forecastPoints,
  }
}

export async function detectSpendingAnomalies(
  userId: string,
  months = 12
) {
  const now = new Date()
  const start = startOfMonth(subMonths(now, months - 1))
  const end = endOfMonth(now)

  const expenses = await prisma.expense.findMany({
    where: { userId, occurredOn: { gte: start, lte: end } },
    include: { category: true },
  })

  const grouped = new Map<
    string,
    {
      descriptor: { id: string; label: string }
      months: Map<string, number>
    }
  >()

  for (const expense of expenses) {
    const descriptor = ensureCategoryDescriptor(expense)
    const key = descriptor.id
    if (!grouped.has(key)) {
      grouped.set(key, {
        descriptor: { id: descriptor.id, label: descriptor.label },
        months: new Map(),
      })
    }
    const month = monthKey(startOfMonth(expense.occurredOn))
    const bucket = grouped.get(key)!
    bucket.months.set(
      month,
      (bucket.months.get(month) ?? 0) +
        decryptNumber(expense.impactAmountEncrypted)
    )
  }

  const currentKey = monthKey(startOfMonth(now))
  const anomalies: Array<{
    categoryId: string
    categoryLabel: string
    current: number
    mean: number
    std: number
    zScore: number
  }> = []

  grouped.forEach((value) => {
    const monthsWithoutCurrent = Array.from(value.months.entries()).filter(
      ([key]) => key !== currentKey
    )
    if (monthsWithoutCurrent.length < 2) return
    const previousValues = monthsWithoutCurrent.map(([, amount]) => amount)
    const stats = calculateStats(previousValues)
    const current = value.months.get(currentKey) ?? 0
    if (stats.std === 0) return
    const zScore = (current - stats.mean) / stats.std
    if (zScore >= 2) {
      anomalies.push({
        categoryId: value.descriptor.id,
        categoryLabel: value.descriptor.label,
        current,
        mean: stats.mean,
        std: stats.std,
        zScore,
      })
    }
  })

  return anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 5)
}

export async function getCategoryHealth(
  userId: string,
  options: { month?: Date; baselineMonths?: number } = {}
) {
  const month = options.month ?? new Date()
  const baselineMonths = options.baselineMonths ?? 6
  const baselineStart = startOfMonth(subMonths(month, baselineMonths))
  const baselineEnd = endOfMonth(subMonths(month, 1))

  const [overview, baselineExpenses] = await Promise.all([
    getMonthlyOverview(userId, month),
    prisma.expense.findMany({
      where: {
        userId,
        occurredOn: { gte: baselineStart, lte: baselineEnd },
      },
      include: { category: true },
    }),
  ])

  const baselineTotals = baselineExpenses.reduce<
    Record<string, { descriptor: { id: string; label: string; color: string }; value: number }>
  >((acc, expense) => {
    const descriptor = ensureCategoryDescriptor(expense)
    const key = descriptor.id
    acc[key] = acc[key] || { descriptor, value: 0 }
    acc[key].value += decryptNumber(expense.impactAmountEncrypted)
    return acc
  }, {})

  const baselineSum = Object.values(baselineTotals).reduce(
    (acc, entry) => acc + entry.value,
    0
  )

  const actualSum = overview.totalExpenses || 1

  const health = overview.categoryTotals.map((category) => {
    const baseline = baselineTotals[category.id]
    const baselineShare = baselineSum
      ? (baseline?.value ?? 0) / baselineSum
      : 0
    const actualShare = category.value / actualSum
    return {
      categoryId: category.id,
      label: category.label,
      color: category.color,
      actual: category.value,
      baseline: baseline?.value ?? 0,
      delta: actualShare - baselineShare,
      status: actualShare > baselineShare ? "over" : "under",
    }
  })

  Object.keys(baselineTotals).forEach((categoryId) => {
    if (health.some((entry) => entry.categoryId === categoryId)) return
    const entry = baselineTotals[categoryId]
    const baselineShare = baselineSum ? entry.value / baselineSum : 0
    health.push({
      categoryId,
      label: entry.descriptor.label,
      color: entry.descriptor.color,
      actual: 0,
      baseline: entry.value,
      delta: -baselineShare,
      status: "under",
    })
  })

  return health.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export type ScenarioInput = {
  incomeDelta?: number
  expenseDelta?: number
  categoryOverrides?: Array<{ categoryId: string; delta: number }>
}

export async function simulateBudget(userId: string, input: ScenarioInput) {
  const [overview, categories] = await Promise.all([
    getMonthlyOverview(userId),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    }),
  ])
  const categoryLookup = new Map(
    categories.map((category) => [category.id, category])
  )
  const overrides = new Map(
    input.categoryOverrides?.map((item) => [item.categoryId, item.delta]) ?? []
  )

  const adjustedCategories = overview.categoryTotals.map((category) => {
    const delta = overrides.get(category.id) ?? 0
    return {
      ...category,
      projected: category.value + delta,
      delta,
    }
  })

  overrides.forEach((delta, categoryId) => {
    if (adjustedCategories.some((category) => category.id === categoryId)) {
      return
    }
    const descriptor = categoryLookup.get(categoryId)
    adjustedCategories.push({
      id: categoryId,
      label: descriptor?.name ?? "Custom",
      color: descriptor?.color ?? "#a78bfa",
      value: 0,
      projected: delta,
      delta,
    })
  })

  const projectedExpenseTotal =
    adjustedCategories.reduce((acc, category) => acc + category.projected, 0) +
    (input.expenseDelta ?? 0)

  const projectedIncome = overview.totalIncome + (input.incomeDelta ?? 0)

  return {
    baseline: overview,
    projectedIncome,
    projectedExpenses: projectedExpenseTotal,
    projectedRemaining: projectedIncome - projectedExpenseTotal,
    categories: adjustedCategories,
  }
}

export async function getIncomeFlowGraph(
  userId: string,
  month: Date = new Date()
) {
  const [overview, incomes] = await Promise.all([
    getMonthlyOverview(userId, month),
    prisma.income.findMany({
      where: {
        userId,
        occurredOn: {
          gte: startOfMonth(month),
          lte: endOfMonth(month),
        },
      },
    }),
  ])

  const recurringIncomeTotal = incomes.reduce((acc, income) => {
    if (!income.recurringSourceId) return acc
    return acc + decryptNumber(income.amountEncrypted)
  }, 0)
  const oneTimeIncomeTotal = Math.max(
    overview.totalIncome - recurringIncomeTotal,
    0
  )

  const nodes: Array<{ name: string; color?: string }> = [
    { name: "Recurring income", color: "var(--chart-1)" },
    { name: "One-time income", color: "var(--chart-2)" },
    { name: "Income", color: "var(--chart-3)" },
    { name: "Remaining", color: "var(--chart-5)" },
    { name: "Spending", color: "var(--chart-4)" },
  ]
  const links: Array<{ source: number; target: number; value: number }> = []

  if (recurringIncomeTotal > 0) {
    links.push({ source: 0, target: 2, value: recurringIncomeTotal })
  }

  if (oneTimeIncomeTotal > 0) {
    links.push({ source: 1, target: 2, value: oneTimeIncomeTotal })
  }

  if (overview.remainingBudget > 0) {
    links.push({
      source: 2,
      target: 3,
      value: overview.remainingBudget,
    })
  }

  const normalizedIncome = Math.max(overview.totalIncome, 0)
  const normalizedExpenses = Math.max(overview.totalExpenses, 0)
  const incomeAppliedToSpending = Math.min(normalizedExpenses, normalizedIncome)

  if (incomeAppliedToSpending > 0) {
    links.push({ source: 2, target: 4, value: incomeAppliedToSpending })
  }

  const spendingShortfall = Math.max(
    normalizedExpenses - normalizedIncome,
    0
  )

  if (spendingShortfall > 0) {
    const savingsNodeIndex = nodes.length
    nodes.push({ name: "Savings", color: "var(--chart-5)" })
    links.push({ source: savingsNodeIndex, target: 4, value: spendingShortfall })
  }

  overview.categoryTotals.forEach((category) => {
    const value = Math.max(category.value, 0)
    if (value <= 0) return
    const targetIndex = nodes.length
    nodes.push({ name: category.label, color: category.color })
    links.push({ source: 4, target: targetIndex, value })
  })

  const filteredLinks = links.filter((link) => link.value > 0)
  const usedNodeIndices = new Set<number>()
  filteredLinks.forEach((link) => {
    usedNodeIndices.add(link.source)
    usedNodeIndices.add(link.target)
  })

  const indexMap = new Map<number, number>()
  const filteredNodes = nodes
    .map((node, originalIndex) => ({ node, originalIndex }))
    .filter(({ originalIndex }) => usedNodeIndices.has(originalIndex))
    .map(({ node, originalIndex }, newIndex) => {
      indexMap.set(originalIndex, newIndex)
      return node
    })

  const normalizedLinks = filteredLinks
    .map((link) => {
      const source = indexMap.get(link.source)
      const target = indexMap.get(link.target)
      if (typeof source !== "number" || typeof target !== "number") {
        return null
      }
      return {
        source,
        target,
        value: link.value,
      }
    })
    .filter(
      (link): link is { source: number; target: number; value: number } =>
        link !== null
    )

  return {
    nodes: filteredNodes,
    links: normalizedLinks,
    totalIncome: overview.totalIncome,
    totalExpenses: overview.totalExpenses,
    recurringIncome: recurringIncomeTotal,
    oneTimeIncome: oneTimeIncomeTotal,
  }
}
