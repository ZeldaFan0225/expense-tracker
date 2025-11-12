import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getAvailableBalanceSeries, getPeriodComparison, type RangePreset,} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const presetParam = params.get("preset") as RangePreset | null
        const preset: RangePreset = presetParam ?? "6m"
        const start = params.get("start")
            ? new Date(params.get("start") as string)
            : undefined
        const end = params.get("end")
            ? new Date(params.get("end") as string)
            : undefined

        const [series, comparison] = await Promise.all([
            getAvailableBalanceSeries(auth.userId, {preset, start, end}),
            getPeriodComparison(auth.userId),
        ])

        return json({series, comparison})
    } catch (error) {
        return handleApiError(error)
    }
}
