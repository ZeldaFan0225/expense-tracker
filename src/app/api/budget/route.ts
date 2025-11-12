import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getMonthlyOverview} from "@/lib/services/analytics-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["budget_read"])
        const params = new URL(request.url).searchParams
        const monthParam = params.get("month")
        const month = monthParam ? new Date(`${monthParam}-01`) : new Date()
        const overview = await getMonthlyOverview(auth.userId, month)
        return json(overview)
    } catch (error) {
        return handleApiError(error)
    }
}
