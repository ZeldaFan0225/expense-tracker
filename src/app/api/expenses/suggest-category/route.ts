import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {suggestCategoryForDescription} from "@/lib/services/expense-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_read"])
        const params = new URL(request.url).searchParams
        const description = params.get("description") ?? ""
        if (!description.trim()) {
            return json({suggestion: null})
        }
        const suggestion = await suggestCategoryForDescription(
            auth.userId,
            description
        )
        return json({suggestion})
    } catch (error) {
        return handleApiError(error)
    }
}
