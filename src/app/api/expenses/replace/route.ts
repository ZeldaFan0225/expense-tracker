import type { NextRequest } from "next/server"
import { z } from "zod"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import { replaceExpenses } from "@/lib/services/expense-service"
import { bulkExpenseSchema } from "@/lib/validation"

const replaceSchema = bulkExpenseSchema
  .pick({ items: true, group: true })
  .extend({
    expenseIds: z.array(z.string().cuid()).min(1).max(20),
  })

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    const body = await request.json()
    const payload = replaceSchema.parse(body)
    const expenses = await replaceExpenses(auth.userId, payload.expenseIds, {
      items: payload.items,
      group: payload.group,
    })
    return json(expenses)
  } catch (error) {
    return handleApiError(error)
  }
}
