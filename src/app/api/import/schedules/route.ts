import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {createImportSchedule, listImportSchedules,} from "@/lib/services/import-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Schedules require a signed-in session."}, {status: 403})
        }
        const schedules = await listImportSchedules(auth.userId)
        return json({schedules})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Schedules require a signed-in session."}, {status: 403})
        }
        const body = await request.json()
        const schedule = await createImportSchedule(auth.userId, body)
        return json({schedule}, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
