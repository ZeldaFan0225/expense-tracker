"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  Line,
  XAxis,
  Tooltip,
  AreaChart,
  Area,
  YAxis,
  Legend,
  Sankey,
} from "recharts"
import type { NodeProps as SankeyNodeProps } from "recharts/types/chart/Sankey"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { formatCurrency } from "@/lib/currency"

const timeRangeTabs = [
  { value: "3m", label: "Last 3M" },
  { value: "6m", label: "Last 6M" },
  { value: "12m", label: "Last 12M" },
  { value: "ytd", label: "YTD" },
]

type RangePreset = "3m" | "6m" | "12m" | "ytd"

type SeriesPoint = {
  key: string
  label: string
  income: number
  expenses: number
  balance: number
}

type Comparison = {
  current: {
    totalIncome: number
    totalExpenses: number
    remainingBudget: number
  }
  previous: {
    totalIncome: number
    totalExpenses: number
    remainingBudget: number
  }
  deltas: {
    income: number
    expenses: number
    remaining: number
  }
}

type ForecastPoint = {
  key: string
  label: string
  forecast: number
}

type ForecastData = {
  history: Array<SeriesPoint & { net: number }>
  forecast: ForecastPoint[]
}

type Anomaly = {
  categoryId: string
  categoryLabel: string
  current: number
  mean: number
  std: number
  zScore: number
}

type CategoryHealth = {
  categoryId: string
  label: string
  color: string
  actual: number
  baseline: number
  delta: number
  status: "over" | "under"
}

type IncomeFlow = {
  nodes: Array<{ name: string; color?: string }>
  links: Array<{ source: number; target: number; value: number }>
  totalIncome: number
  totalExpenses: number
  recurringIncome: number
  oneTimeIncome: number
}

type ScenarioCategory = {
  id: string
  name: string
}

type AnalyticsDashboardProps = {
  initialSeries: SeriesPoint[]
  initialComparison: Comparison
  initialForecast: ForecastData
  initialAnomalies: Anomaly[]
  initialCategoryHealth: CategoryHealth[]
  initialIncomeFlow: IncomeFlow
  categories: ScenarioCategory[]
  currency?: string
}

export function AnalyticsDashboard({
  initialSeries,
  initialComparison,
  initialForecast,
  initialAnomalies,
  initialCategoryHealth,
  initialIncomeFlow,
  categories,
  currency = "USD",
}: AnalyticsDashboardProps) {
  const [preset, setPreset] = React.useState<RangePreset>("6m")
  const [series, setSeries] = React.useState(initialSeries)
  const [comparison, setComparison] = React.useState(initialComparison)
  const [forecast, setForecast] = React.useState(initialForecast)
  const [anomalies, setAnomalies] = React.useState(initialAnomalies)
  const [categoryHealth, setCategoryHealth] = React.useState(
    initialCategoryHealth
  )
  const [incomeFlow, setIncomeFlow] = React.useState(initialIncomeFlow)
  const [baselineMonths, setBaselineMonths] = React.useState(6)
  const [loadingRange, setLoadingRange] = React.useState(false)
  const [refreshingInsights, setRefreshingInsights] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    async function loadRange() {
      setLoadingRange(true)
      try {
        const params = new URLSearchParams({ preset })
        const response = await fetch(`/api/spending?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Failed to load analytics")
        const data = await response.json()
        setSeries(data.series.series)
        setComparison(data.comparison)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error(error)
      } finally {
        setLoadingRange(false)
      }
    }
    loadRange()
    return () => controller.abort()
  }, [preset])

  const refreshInsights = React.useCallback(async () => {
    setRefreshingInsights(true)
    try {
      const [forecastRes, anomalyRes, healthRes, flowRes] = await Promise.all([
        fetch("/api/analytics/forecast"),
        fetch("/api/analytics/anomalies"),
        fetch(`/api/analytics/category-health?baselineMonths=${baselineMonths}`),
        fetch("/api/analytics/income-flow"),
      ])
      if (!forecastRes.ok) throw new Error("Forecast failed")
      if (!anomalyRes.ok) throw new Error("Anomalies failed")
      if (!healthRes.ok) throw new Error("Category health failed")
      if (!flowRes.ok) throw new Error("Income flow failed")
      const [forecastData, anomalyData, healthData, flowData] = await Promise.all([
        forecastRes.json(),
        anomalyRes.json(),
        healthRes.json(),
        flowRes.json(),
      ])
      setForecast(forecastData)
      setAnomalies(anomalyData.anomalies)
      setCategoryHealth(healthData.health)
      setIncomeFlow(flowData)
    } catch (error) {
      console.error(error)
    } finally {
      setRefreshingInsights(false)
    }
  }, [baselineMonths])

  React.useEffect(() => {
    refreshInsights()
  }, [refreshInsights])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={preset} onChange={(value) => setPreset(value as RangePreset)} tabs={timeRangeTabs} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={refreshInsights} disabled={refreshingInsights}>
            {refreshingInsights ? "Refreshing…" : "Refresh insights"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.open("/api/export", "_blank")}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-col gap-1">
          <CardTitle>Available balance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Net income vs expenses per month
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number, label: string) => [
                    formatCurrency(value, currency),
                    label,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <DeltaCard
          label="Income"
          current={comparison.current.totalIncome}
          previous={comparison.previous.totalIncome}
          delta={comparison.deltas.income}
          currency={currency}
        />
        <DeltaCard
          label="Expenses"
          current={comparison.current.totalExpenses}
          previous={comparison.previous.totalExpenses}
          delta={comparison.deltas.expenses}
          currency={currency}
        />
        <DeltaCard
          label="Remaining"
          current={comparison.current.remainingBudget}
          previous={comparison.previous.remainingBudget}
          delta={comparison.deltas.remaining}
          currency={currency}
        />
      </div>

      <div className="space-y-6">
        <ForecastCard forecast={forecast} currency={currency} />
        <IncomeFlowCard flow={incomeFlow} currency={currency} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryHealthCard
          data={categoryHealth}
          currency={currency}
          baselineMonths={baselineMonths}
          onBaselineChange={(value) => setBaselineMonths(value)}
        />
        <ScenarioPlanner categories={categories} currency={currency} />
      </div>

      <AnomalyCard anomalies={anomalies} currency={currency} />

      {loadingRange ? (
        <p className="text-sm text-muted-foreground">Updating analytics…</p>
      ) : null}
    </div>
  )
}

function DeltaCard({
  label,
  current,
  previous,
  delta,
  currency,
}: {
  label: string
  current: number
  previous: number
  delta: number
  currency: string
}) {
  const positive = delta >= 0
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold">
          {formatCurrency(current, currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          Prev {formatCurrency(previous, currency)}
        </p>
        <p
          className={`text-sm font-medium ${
            positive ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {positive ? "+" : ""}
          {formatCurrency(delta, currency)} vs last month
        </p>
      </CardContent>
    </Card>
  )
}

function ForecastCard({
  forecast,
  currency,
}: {
  forecast: ForecastData
  currency: string
}) {
  const gradientBaseId = React.useId().replace(/:/g, "")
  const actualGradientId = `${gradientBaseId}-actual`
  const projectionGradientId = `${gradientBaseId}-projection`
  const data = React.useMemo(() => {
    return [
      ...forecast.history.slice(-6).map((point) => ({
        label: point.label,
        net: point.net,
      })),
      ...forecast.forecast.map((point) => ({
        label: `${point.label}*`,
        forecast: point.forecast,
      })),
    ]
  }, [forecast])

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Cash forecast</CardTitle>
        <p className="text-sm text-muted-foreground">
          Simple 3-month moving average projection
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={actualGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={projectionGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(value, currency)} width={80} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Legend />
              <Area
                type="monotone"
                dataKey="net"
                stroke="var(--chart-1)"
                fillOpacity={1}
                fill={`url(#${actualGradientId})`}
                name="Actual"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="var(--chart-2)"
                strokeDasharray="6 4"
                fill={`url(#${projectionGradientId})`}
                name="Forecast"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function IncomeFlowCard({ flow, currency }: { flow: IncomeFlow; currency: string }) {
  const [isCompact, setIsCompact] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const media = window.matchMedia("(max-width: 1024px)")
    const updateMatch = () => setIsCompact(media.matches)
    updateMatch()
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMatch)
      return () => media.removeEventListener("change", updateMatch)
    }
    media.addListener(updateMatch)
    return () => media.removeListener(updateMatch)
  }, [])

  const sankeyMargin = React.useMemo(
    () =>
      isCompact
        ? { top: 24, right: 24, bottom: 80, left: 24 }
        : { top: 16, right: 120, bottom: 16, left: 150 },
    [isCompact]
  )
  const sankeyLayout = isCompact ? "vertical" : "horizontal"
  const sankeyPadding = isCompact ? 28 : 48
  const sankeyNodeWidth = isCompact ? 14 : 18
  const linkCurvature = isCompact ? 0.35 : 0.5
  const chartHeight = isCompact ? "34rem" : "30rem"

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Income flow</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sankey view of where income is allocated
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="w-full" style={{ height: chartHeight }}>
          {flow.links.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={{ nodes: flow.nodes, links: flow.links }}
                nodePadding={sankeyPadding}
                nodeWidth={sankeyNodeWidth}
                linkCurvature={linkCurvature}
                layout={sankeyLayout}
                margin={sankeyMargin}
                node={<ThemedSankeyNode />}
              >
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency)}
                  contentStyle={{
                    borderRadius: "1rem",
                    borderColor: "var(--border)",
                    background: "var(--card)",
                  }}
                  labelStyle={{
                    color: "var(--foreground)",
                    fontWeight: 600,
                  }}
                  itemStyle={{
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Add income and categorized spend to visualize flow.
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            Recurring income {formatCurrency(flow.recurringIncome, currency)} · One-time income{" "}
            {formatCurrency(flow.oneTimeIncome, currency)}
          </p>
          <p>
            Total income {formatCurrency(flow.totalIncome, currency)} · Expenses{" "}
            {formatCurrency(flow.totalExpenses, currency)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ThemedSankeyNode(props: SankeyNodeProps) {
  const { x, y, width, height, payload } = props
  const fill = payload?.color ?? "var(--secondary)"
  const isSink = (payload?.sourceLinks?.length ?? 0) === 0
  const isSource = (payload?.targetLinks?.length ?? 0) === 0
  const inwardOffset = 32
  const defaultOffset = 16
  let labelX = x + width + defaultOffset
  let textAnchor: "start" | "end" = "start"

  if (isSource) {
    labelX = x + width + inwardOffset
  }

  if (isSink) {
    textAnchor = "end"
    labelX = x - inwardOffset
  }
  const textColor = "var(--foreground)"

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        fill={fill}
        stroke="var(--border)"
        strokeWidth={1}
        opacity={0.9}
      />
      <text
        x={labelX}
        y={y + height / 2}
        fill={textColor}
        fontSize={12}
        fontWeight={500}
        dominantBaseline="middle"
        textAnchor={textAnchor}
      >
        {payload?.name}
      </text>
    </g>
  )
}

function CategoryHealthCard({
  data,
  currency,
  baselineMonths,
  onBaselineChange,
}: {
  data: CategoryHealth[]
  currency: string
  baselineMonths: number
  onBaselineChange: (value: number) => void
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-col gap-3">
        <div>
          <CardTitle>Category health</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare this month vs baseline averages
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label>Baseline window</Label>
          <Select
            value={String(baselineMonths)}
            onChange={(event) => onBaselineChange(Number(event.target.value))}
            className="w-28"
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground">
          <span>Category</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Baseline</span>
          <span className="text-right">Delta</span>
        </div>
        <div className="space-y-2">
          {data.slice(0, 8).map((entry) => (
            <div
              key={entry.categoryId}
              className="grid grid-cols-4 items-center rounded-2xl border px-3 py-2 text-sm"
            >
              <span className="truncate font-medium">{entry.label}</span>
              <span className="text-right">
                {formatCurrency(entry.actual, currency)}
              </span>
              <span className="text-right text-muted-foreground">
                {formatCurrency(entry.baseline, currency)}
              </span>
              <span
                className={`text-right text-xs font-semibold ${
                  entry.status === "over"
                    ? "text-rose-500"
                    : "text-emerald-500"
                }`}
              >
                {entry.status === "over" ? "+" : ""}
                {(entry.delta * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ScenarioPlanner({
  categories,
  currency,
}: {
  categories: ScenarioCategory[]
  currency: string
}) {
  const [incomeDelta, setIncomeDelta] = React.useState("0")
  const [expenseDelta, setExpenseDelta] = React.useState("0")
  const [categoryId, setCategoryId] = React.useState("")
  const [categoryDelta, setCategoryDelta] = React.useState("0")
  const [result, setResult] = React.useState<null | {
    projectedIncome: number
    projectedExpenses: number
    projectedRemaining: number
  }>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        incomeDelta: Number(incomeDelta || 0),
        expenseDelta: Number(expenseDelta || 0),
      }
      if (categoryId) {
        payload.categoryOverrides = [
          { categoryId, delta: Number(categoryDelta || 0) },
        ]
      }
      const response = await fetch("/api/analytics/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Scenario failed")
      const data = await response.json()
      setResult({
        projectedIncome: data.projectedIncome,
        projectedExpenses: data.projectedExpenses,
        projectedRemaining: data.projectedRemaining,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Scenario planner</CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulate income or category adjustments
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Income delta"
              input={
                <Input
                  type="number"
                  value={incomeDelta}
                  onChange={(event) => setIncomeDelta(event.target.value)}
                />
              }
              hint="Adds to current income"
            />
            <Field
              label="Expense delta"
              input={
                <Input
                  type="number"
                  value={expenseDelta}
                  onChange={(event) => setExpenseDelta(event.target.value)}
                />
              }
              hint="Applies to total expenses"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Category override"
              input={
                <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Skip</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              label="Category delta"
              input={
                <Input
                  type="number"
                  value={categoryDelta}
                  onChange={(event) => setCategoryDelta(event.target.value)}
                />
              }
              hint="Positive = spend more"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Calculating…" : "Simulate"}
          </Button>
        </form>
        {result ? (
          <div className="mt-4 rounded-2xl border p-4 text-sm">
            <p className="font-medium">Projection</p>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <p>Income</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(result.projectedIncome, currency)}
                </p>
              </div>
              <div>
                <p>Expenses</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(result.projectedExpenses, currency)}
                </p>
              </div>
              <div>
                <p>Remaining</p>
                <p className="text-base font-semibold text-foreground">
                  {formatCurrency(result.projectedRemaining, currency)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AnomalyCard({
  anomalies,
  currency,
}: {
  anomalies: Anomaly[]
  currency: string
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Anomaly alerts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Categories deviating &gt;2σ from baseline
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No suspicious spend detected this month.
          </p>
        ) : (
          <ul className="space-y-2">
            {anomalies.map((anomaly) => (
              <li
                key={anomaly.categoryId}
                className="flex items-center justify-between rounded-2xl border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{anomaly.categoryLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Mean {formatCurrency(anomaly.mean, currency)} · σ=
                    {formatCurrency(anomaly.std, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-rose-500">
                    {formatCurrency(anomaly.current, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    z-score {anomaly.zScore.toFixed(1)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  input,
  hint,
}: {
  label: string
  input: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
