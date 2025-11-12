"use client"

import {Area, AreaChart, ResponsiveContainer, Tooltip, XAxis} from "recharts"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {formatCurrency} from "@/lib/currency"

type CashHistoryPoint = {
    label: string
    income: number
    expenses: number
}

type CashHistoryChartProps = {
    data: CashHistoryPoint[]
    currency?: string
}

export function CashHistoryChart({
                                     data,
                                     currency = "USD",
                                 }: CashHistoryChartProps) {
    return (
        <Card className="rounded-3xl">
            <CardHeader className="pb-4">
                <CardTitle>Cash history</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="income" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="expenses" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tickLine={false} axisLine={false}/>
                            <Tooltip
                                cursor={{stroke: "var(--border)"}}
                                formatter={(value: number, name: string) => [
                                    formatCurrency(value, currency),
                                    name,
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="income"
                                stroke="var(--chart-2)"
                                fill="url(#income)"
                                strokeWidth={2}
                                name="Income"
                            />
                            <Area
                                type="monotone"
                                dataKey="expenses"
                                stroke="var(--chart-3)"
                                fill="url(#expenses)"
                                strokeWidth={2}
                                name="Expenses"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
