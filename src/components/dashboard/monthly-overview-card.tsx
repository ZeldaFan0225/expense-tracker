import {format} from "date-fns"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {formatCurrency} from "@/lib/currency"

type Overview = {
    start: Date
    end: Date
    totalExpenses: number
    totalIncome: number
    remainingBudget: number
}

type MonthlyOverviewCardProps = {
    overview: Overview
    currency?: string
}

export function MonthlyOverviewCard({
                                        overview,
                                        currency = "USD",
                                    }: MonthlyOverviewCardProps) {
    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {format(overview.start, "MMM d")} – {format(overview.end, "MMM d")}
                        </p>
                        <CardTitle>Monthly overview</CardTitle>
                    </div>
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {currency}
          </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                    <OverviewStat
                        label="Income"
                        value={formatCurrency(overview.totalIncome, currency)}
                        trend="positive"
                    />
                    <OverviewStat
                        label="Expenses"
                        value={formatCurrency(overview.totalExpenses, currency)}
                        trend="negative"
                    />
                    <OverviewStat
                        label="Remaining"
                        value={formatCurrency(overview.remainingBudget, currency)}
                        trend={overview.remainingBudget >= 0 ? "positive" : "negative"}
                    />
                </div>
            </CardContent>
        </Card>
    )
}

function OverviewStat({
                          label,
                          value,
                          trend,
                      }: {
    label: string
    value: string
    trend: "positive" | "negative"
}) {
    return (
        <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p
                className={`mt-2 text-xl font-semibold ${
                    trend === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                }`}
            >
                {value}
            </p>
        </div>
    )
}
