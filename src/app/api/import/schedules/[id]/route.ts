import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteImportSchedule, updateImportSchedule,} from "@/lib/services/import-service"

type Params = { params: Promise<{ id: string }> }

async function resolveId(context: Params) {
    const {id} = await context.params
    return id
}

export async function PATCH(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Schedules require a signed-in session."}, {status: 403})
        }
        const body = await request.json()
        const id = await resolveId(context)
        const schedule = await updateImportSchedule(auth.userId, id, body)
        return json({schedule})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json({error: "Schedules require a signed-in session."}, {status: 403})
        }
        const id = await resolveId(context)
        await deleteImportSchedule(auth.userId, id)
        return json({success: true})
    } catch (error) {
        return handleApiError(error)
    }
}
