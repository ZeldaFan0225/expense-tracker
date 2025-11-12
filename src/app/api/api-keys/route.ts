import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {createApiKey, listApiKeys,} from "@/lib/services/api-key-service"
import {scopesToStrings} from "@/lib/api-keys"

function presentApiKey(record: Awaited<ReturnType<typeof listApiKeys>>[number]) {
    const {hashedSecret, ...rest} = record
    return {
        ...rest,
        scopes: scopesToStrings(record.scopes),
    }
}

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Manage API keys through the dashboard."}, {status: 403})
        }
        const keys = await listApiKeys(auth.userId)
        return json({
            keys: keys.map(presentApiKey),
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Manage API keys through the dashboard."}, {status: 403})
        }
        const payload = await request.json()
        const result = await createApiKey(auth.userId, payload)
        return json(
            {
                token: result.token,
                record: presentApiKey(result.record),
            },
            {status: 201}
        )
    } catch (error) {
        return handleApiError(error)
    }
}
