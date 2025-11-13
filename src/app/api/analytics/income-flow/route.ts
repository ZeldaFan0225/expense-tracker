import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getIncomeFlowGraph, type RangePreset} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const preset = params.get("preset") as RangePreset | null
        const start = params.get("start")
        const end = params.get("end")
        const graph = await getIncomeFlowGraph(
            auth.userId,
            {
                preset: preset ?? undefined,
                start: start ? new Date(start) : undefined,
                end: end ? new Date(end) : undefined,
            }
        )
        return json(graph)
    } catch (error) {
        return handleApiError(error)
    }
}
