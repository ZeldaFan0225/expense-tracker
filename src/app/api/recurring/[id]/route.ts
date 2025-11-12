import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {
    deleteRecurringExpense,
    toggleRecurringExpense,
    updateRecurringExpense,
} from "@/lib/services/recurring-expense-service"

type Params = {
    params: Promise<{ id: string }>
}

async function resolveId(params: Params["params"]) {
    const {id} = await params
    return id
}

export async function PATCH(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const id = await resolveId(context.params)
        const template = await updateRecurringExpense(
            auth.userId,
            id,
            payload
        )
        return json(template)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const id = await resolveId(context.params)
        const template = await toggleRecurringExpense(auth.userId, id)
        return json(template)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const id = await resolveId(context.params)
        await deleteRecurringExpense(auth.userId, id)
        return json({ok: true})
    } catch (error) {
        return handleApiError(error)
    }
}
