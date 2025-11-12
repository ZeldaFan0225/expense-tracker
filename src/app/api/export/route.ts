import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {exportSpendingCsv} from "@/lib/services/analytics-service"
import {handleApiError} from "@/lib/http"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const start = params.get("start")
            ? new Date(params.get("start") as string)
            : undefined
        const end = params.get("end")
            ? new Date(params.get("end") as string)
            : undefined

        const csv = await exportSpendingCsv(auth.userId, {start, end})
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
            },
        })
    } catch (error) {
        return handleApiError(error)
    }
}
