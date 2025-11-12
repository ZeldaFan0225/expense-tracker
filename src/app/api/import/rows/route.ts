import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {csvImportSchema} from "@/lib/validation"
import {importStructuredRows} from "@/lib/services/import-service"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json(
                {error: "Structured import requires a signed-in session."},
                {status: 403}
            )
        }

        const body = await request.json()
        const parsed = csvImportSchema.parse({mode: body.mode ?? "expenses"})
        const result = await importStructuredRows(
            auth.userId,
            parsed.mode,
            body.rows
        )
        return json(result, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
