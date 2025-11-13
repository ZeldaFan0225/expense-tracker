"use client"

import * as React from "react"
import {Area, AreaChart, CartesianGrid, Dot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts"
import {formatCurrency} from "@/lib/currency"

type AnomalyChartProps = {
    mean: number
    std: number
    current: number
    currency: string
}

function generateNormalDistribution(mean: number, std: number, points = 100) {
    if (std === 0) {
        return [{x: mean, y: 1}]
    }

    const data = []
    const minX = mean - 4 * std
    const maxX = mean + 4 * std
    const step = (maxX - minX) / (points - 1)

    for (let i = 0; i < points; i++) {
        const x = minX + i * step
        const y = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
        data.push({x, y})
    }
    return data
}

export function AnomalyChart({mean, std, current, currency}: AnomalyChartProps) {
    const distributionData = React.useMemo(
        () => generateNormalDistribution(mean, std),
        [mean, std]
    )

    const currentPoint = {
        x: current,
        y: (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((current - mean) / std, 2)),
    }

    return (
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={distributionData}
                    margin={{
                        top: 5,
                        right: 20,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis
                        dataKey="x"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => formatCurrency(value, currency)}
                        tickCount={5}
                    />
                    <YAxis hide/>
                    <Tooltip
                        formatter={(value: number, name: string) => {
                            if (name === 'Current') {
                                return [formatCurrency(value, currency), "Current Spend"]
                            }
                            return null
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="y"
                        stroke="var(--chart-1)"
                        fill="var(--chart-1)"
                        fillOpacity={0.3}
                        dot={false}
                        name="Distribution"
                    />
                    <ReferenceLine x={current} stroke="var(--chart-2)" strokeWidth={2} label="Current"/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
