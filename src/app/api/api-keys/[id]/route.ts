import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {revokeApiKey} from "@/lib/services/api-key-service"

function extractIdFromUrl(request: NextRequest) {
    const url = new URL(request.url)
    const parts = url.pathname.split("/").filter(Boolean)
    return parts[parts.length - 1]
}

export async function DELETE(request: NextRequest) {
    try {
        const id = extractIdFromUrl(request)
        if (!id) {
            return json({error: "Missing API key id."}, {status: 400})
        }
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Manage API keys through the dashboard."}, {status: 403})
        }
        const result = await revokeApiKey(auth.userId, id)
        return json({ok: true, action: result.action})
    } catch (error) {
        return handleApiError(error)
    }
}
