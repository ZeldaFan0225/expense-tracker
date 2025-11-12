import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {ensureDefaultCategories, listCategories, upsertCategory,} from "@/lib/services/category-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_read"])
        await ensureDefaultCategories(auth.userId)
        const categories = await listCategories(auth.userId)
        return json({categories})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const category = await upsertCategory(auth.userId, payload)
        return json(category)
    } catch (error) {
        return handleApiError(error)
    }
}
