import {Card, CardContent} from "@/components/ui/card"

type QuickStatsProps = {
    stats: Array<{
        label: string
        value: string
        hint?: string
    }>
}

export function QuickStats({stats}: QuickStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
                <Card key={stat.label} className="rounded-2xl">
                    <CardContent className="p-6">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {stat.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                        {stat.hint ? (
                            <p className="text-xs text-muted-foreground">{stat.hint}</p>
                        ) : null}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
