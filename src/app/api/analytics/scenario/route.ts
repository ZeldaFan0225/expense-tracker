import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {scenarioInputSchema} from "@/lib/validation"
import {simulateBudget} from "@/lib/services/analytics-service"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const body = await request.json()
        const parsed = scenarioInputSchema.parse(body)
        const result = await simulateBudget(auth.userId, parsed)
        return json(result)
    } catch (error) {
        return handleApiError(error)
    }
}
