import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteRecurringIncome, updateRecurringIncome,} from "@/lib/services/recurring-income-service"

type Params = {
    params: Promise<{ id: string }>
}

async function resolveId(params: Params["params"]) {
    const {id} = await params
    return id
}

export async function PATCH(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["income_write"])
        const payload = await request.json()
        const id = await resolveId(context.params)
        const template = await updateRecurringIncome(
            auth.userId,
            id,
            payload
        )
        return json(template)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["income_write"])
        const id = await resolveId(context.params)
        await deleteRecurringIncome(auth.userId, id)
        return json({ok: true})
    } catch (error) {
        return handleApiError(error)
    }
}
