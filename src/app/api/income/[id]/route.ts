import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { deleteIncome, updateIncome } from "@/lib/services/income-service"
import { handleApiError, json } from "@/lib/http"

type Context = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const auth = await authenticateRequest(request, ["income_write"])
    const payload = await request.json()
    const income = await updateIncome(auth.userId, id, payload)
    return json(income)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const auth = await authenticateRequest(request, ["income_write"])
    await deleteIncome(auth.userId, id)
    return json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
