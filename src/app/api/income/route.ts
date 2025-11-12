import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {addIncome} from "@/lib/services/income-service"
import {handleApiError, json} from "@/lib/http"

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["income_write"])
        const payload = await request.json()
        const income = await addIncome(auth.userId, payload)
        return json(income, {status: 201})
    } catch (error) {
        return handleApiError(error)
    }
}
