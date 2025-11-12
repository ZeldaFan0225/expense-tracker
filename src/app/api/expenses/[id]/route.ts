import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteExpense, getExpense, updateExpense,} from "@/lib/services/expense-service"

type Params = {
    params: Promise<{ id: string }>
}

async function resolveId(context: Params) {
    const {id} = await context.params
    return id
}

export async function GET(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_read"])
        const id = await resolveId(context)
        const expense = await getExpense(auth.userId, id)
        if (!expense) {
            return json({error: "Not found"}, {status: 404})
        }
        return json(expense)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const id = await resolveId(context)
        const expense = await updateExpense(auth.userId, id, payload)
        return json(expense)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const id = await resolveId(context)
        await deleteExpense(auth.userId, id)
        return json({ok: true})
    } catch (error) {
        return handleApiError(error)
    }
}
