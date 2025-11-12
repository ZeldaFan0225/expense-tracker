import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getIncomeFlowGraph} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const monthParam = params.get("month")
        const graph = await getIncomeFlowGraph(
            auth.userId,
            monthParam ? new Date(monthParam) : undefined
        )
        return json(graph)
    } catch (error) {
        return handleApiError(error)
    }
}
