import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteCategory} from "@/lib/services/category-service"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: Params) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const {id} = await context.params
        await deleteCategory(auth.userId, id)
        return json({ok: true})
    } catch (error) {
        return handleApiError(error)
    }
}
