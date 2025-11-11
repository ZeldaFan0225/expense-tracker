import { format, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailySummary } from "@/lib/services/summary-service"

type DailySummaryBoardProps = {
  summary: DailySummary
  currency: string
}

export function DailySummaryBoard({ summary, currency }: DailySummaryBoardProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  })

  const averageSpend =
    summary.trend.length > 0
      ? summary.trend.reduce((total, entry) => total + entry.impactAmount, 0) /
        summary.trend.length
      : 0

  const spendDelta = summary.totals.expenses - averageSpend
  const spendDeltaLabel =
    spendDelta >= 0 ? `+${formatter.format(spendDelta)}` : formatter.format(spendDelta)

  const humanDate = format(parseISO(summary.date), "EEEE, MMM d")

  return (
    <Card className="rounded-3xl border bg-gradient-to-b from-muted/40 via-background to-background">
      <CardHeader>
        <CardTitle>Daily snapshot</CardTitle>
        <p className="text-sm text-muted-foreground">
          Income, expenses, and net cash for {humanDate}.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <SummaryStat
          label="Income"
          value={formatter.format(summary.totals.income)}
          hint="Logged today"
        />
        <SummaryStat
          label="Expenses"
          value={formatter.format(summary.totals.expenses)}
          hint={`vs 7-day avg ${spendDeltaLabel}`}
        />
        <SummaryStat
          label="Net change"
          value={formatter.format(summary.totals.net)}
          hint={summary.totals.net >= 0 ? "Positive cash flow" : "Over budget today"}
          positive={summary.totals.net >= 0}
        />
      </CardContent>
    </Card>
  )
}

function SummaryStat({
  label,
  value,
  hint,
  positive,
}: {
  label: string
  value: string
  hint: string
  positive?: boolean
}) {
  return (
    <div className="rounded-2xl border px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p
        className={`text-sm ${
          positive
            ? "text-emerald-500"
            : positive === false
              ? "text-destructive"
              : "text-muted-foreground"
        }`}
      >
        {hint}
      </p>
    </div>
  )
}
