import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {detectSpendingAnomalies} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const months = Number(params.get("months") ?? "12")
        const data = await detectSpendingAnomalies(auth.userId, months)
        return json({anomalies: data})
    } catch (error) {
        return handleApiError(error)
    }
}
