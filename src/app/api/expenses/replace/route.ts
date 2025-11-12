import {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {replaceExpenses} from "@/lib/services/expense-service"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const {expenseIds, ...payload} = await request.json()
        if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
            return json({error: "expenseIds are required"}, {status: 400})
        }
        const updatedExpenses = await replaceExpenses(auth.userId, expenseIds, payload)
        return json(updatedExpenses)
    } catch (error) {
        return handleApiError(error)
    }
}
