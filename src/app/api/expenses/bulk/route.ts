import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {bulkCreateExpenses} from "@/lib/services/expense-service"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const expenses = await bulkCreateExpenses(auth.userId, payload)
        return json({expenses}, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
