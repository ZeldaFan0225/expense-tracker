import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {createRecurringIncome, listRecurringIncomes,} from "@/lib/services/recurring-income-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["income_write"])
        const templates = await listRecurringIncomes(auth.userId)
        return json({templates})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["income_write"])
        const payload = await request.json()
        const template = await createRecurringIncome(auth.userId, payload)
        return json(template, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
