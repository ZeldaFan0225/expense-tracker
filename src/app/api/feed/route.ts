import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getActivityFeed} from "@/lib/services/feed-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const feed = await getActivityFeed(auth.userId)
        return json({feed})
    } catch (error) {
        return handleApiError(error)
    }
}
