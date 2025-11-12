import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {createExpense, listExpenses,} from "@/lib/services/expense-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_read"])
        const params = new URL(request.url).searchParams
        const start = params.get("start")
            ? new Date(params.get("start") as string)
            : undefined
        const end = params.get("end")
            ? new Date(params.get("end") as string)
            : undefined

        const expenses = await listExpenses(auth.userId, {start, end})
        return json({expenses})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const expense = await createExpense(auth.userId, payload)
        return json(expense, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
