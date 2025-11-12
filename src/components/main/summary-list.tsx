import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"

type SummaryListItem = {
    id: string
    title: string
    subtitle?: string | null
    amount?: string
    meta?: string
}

type SummaryListProps = {
    title: string
    description: string
    emptyLabel: string
    items: SummaryListItem[]
}

export function SummaryList({
                                title,
                                description,
                                emptyLabel,
                                items,
                            }: SummaryListProps) {
    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between rounded-2xl border px-3 py-2"
                        >
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                {item.subtitle ? (
                                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                ) : null}
                            </div>
                            <div className="text-right">
                                {item.amount ? (
                                    <p className="text-sm font-semibold text-foreground">{item.amount}</p>
                                ) : null}
                                {item.meta ? (
                                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
