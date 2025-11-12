import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getForecast} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const months = params.get("months")
        const horizon = params.get("horizon")
        const data = await getForecast(auth.userId, {
            months: months ? Number(months) : undefined,
            horizon: horizon ? Number(horizon) : undefined,
        })
        return json(data)
    } catch (error) {
        return handleApiError(error)
    }
}
