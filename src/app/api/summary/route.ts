import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import { getDailySummary } from "@/lib/services/summary-service"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, ["analytics_read"])
    const dateParam = request.nextUrl.searchParams.get("date")
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const summary = await getDailySummary(auth.userId, targetDate)
    return json({
      summary,
      currency: auth.user.defaultCurrency,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
