import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getCategoryHealth} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const monthParam = params.get("month")
        const baseline = params.get("baselineMonths")
        const data = await getCategoryHealth(auth.userId, {
            month: monthParam ? new Date(monthParam) : undefined,
            baselineMonths: baseline ? Number(baseline) : undefined,
        })
        return json({health: data})
    } catch (error) {
        return handleApiError(error)
    }
}
