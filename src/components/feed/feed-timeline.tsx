import * as React from "react"
import {format} from "date-fns"
import {Activity, Banknote, CalendarClock, KeyRound, RefreshCcw, Wallet} from "lucide-react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import type {FeedEvent} from "@/lib/services/feed-service"
import {formatCurrency} from "@/lib/currency"
import {cn} from "@/lib/utils"

const iconMap: Record<FeedEvent["type"], React.ComponentType<{ className?: string }>> = {
    expense: Wallet,
    "expense-group": Wallet,
    income: Banknote,
    "recurring-expense": RefreshCcw,
    "recurring-income": RefreshCcw,
    "api-key": KeyRound,
    "import-schedule": CalendarClock,
}

type FeedTimelineProps = {
    feed: FeedEvent[]
    currency?: string
    title?: string
    description?: string
    emptyState?: string
}

export function FeedTimeline({
                                 feed,
                                 currency = "USD",
                                 title = "Live feed",
                                 description = "Chronological view of expenses, income, automations, and keys",
                                 emptyState = "No activity yet. Start adding expenses or automations.",
                             }: FeedTimelineProps) {
    const getShareLabel = React.useCallback(
        (actual?: number, impact?: number, splitBy?: number) => {
            const parts: string[] = []
            const hasActualDiff =
                typeof actual === "number" &&
                typeof impact === "number" &&
                Math.abs(actual - impact) > 0.005
            if (hasActualDiff) {
                parts.push(`of ${formatCurrency(actual, currency)} total`)
            }
            if (splitBy && splitBy > 1) {
                parts.push(`${splitBy}-way split`)
            }
            return parts.length ? parts.join(" · ") : null
        },
        [currency]
    )

    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {description}
                </p>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {feed.map((event) => {
                        const Icon = iconMap[event.type] ?? Activity
                        const eventShareLabel = getShareLabel(
                            event.actualAmount,
                            event.amount,
                            event.splitBy
                        )
                        return (
                            <li key={`${event.type}-${event.id}`} className="flex items-start gap-4">
                                <div className="mt-1 rounded-2xl border bg-muted/40 p-2">
                                    <Icon className="size-4 text-muted-foreground"/>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {event.title}
                                    </p>
                                    {event.subtitle ? (
                                        <p className="text-xs text-muted-foreground">
                                            {event.subtitle}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        {format(event.timestamp, "MMM d, yyyy")}
                                    </p>
                                    {event.items?.length ? (
                                        <div className="mt-2 space-y-2 rounded-2xl border bg-muted/30 p-3">
                                            {event.items.map((item) => {
                                                const itemShareLabel = getShareLabel(
                                                    item.actualAmount,
                                                    item.amount,
                                                    event.splitBy
                                                )
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex w-full flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-4"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-semibold text-foreground">
                                                                {item.title}
                                                            </p>
                                                            {item.category ? (
                                                                <p className="text-muted-foreground">{item.category}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="shrink-0 text-right sm:text-left">
                                                            {typeof item.amount === "number" ? (
                                                                <p className="font-semibold text-rose-500">
                                                                    {formatCurrency(item.amount, currency)}
                                                                </p>
                                                            ) : null}
                                                            {itemShareLabel ? (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {itemShareLabel}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                                {typeof event.amount === "number" ? (
                                    <div className="text-right">
                                        <p
                                            className={cn(
                                                "text-sm font-semibold",
                                                event.type === "expense" || event.type === "expense-group"
                                                    ? "text-rose-500"
                                                    : event.type === "income" || event.type === "recurring-income"
                                                        ? "text-emerald-500"
                                                        : "text-foreground"
                                            )}
                                        >
                                            {formatCurrency(event.amount, currency)}
                                        </p>
                                        {eventShareLabel ? (
                                            <p className="text-xs text-muted-foreground">{eventShareLabel}</p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </li>
                        )
                    })}
                    {!feed.length ? (
                        <li className="text-sm text-muted-foreground">
                            {emptyState}
                        </li>
                    ) : null}
                </ul>
            </CardContent>
        </Card>
    )
}
