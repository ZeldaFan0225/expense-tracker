import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {createRecurringExpense, listRecurringExpenses,} from "@/lib/services/recurring-expense-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_read"])
        const templates = await listRecurringExpenses(auth.userId)
        return json({templates})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const template = await createRecurringExpense(auth.userId, payload)
        return json(template, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
