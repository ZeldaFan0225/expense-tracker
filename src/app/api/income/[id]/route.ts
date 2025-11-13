import {NextResponse} from "next/server"
import {auth} from "@/lib/auth-server"
import {deleteIncome, updateIncome} from "@/lib/services/income-service"
import {incomeUpdateSchema} from "@/lib/validation"

export async function PATCH(
    req: Request,
    {params}: { params: { id: string } }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    try {
        const body = await req.json()
        const payload = incomeUpdateSchema.parse(body)
        const updated = await updateIncome(session.user.id, params.id, payload)
        return NextResponse.json(updated)
    } catch (error) {
        console.error(error)
        return NextResponse.json({error: "Failed to update income"}, {status: 500})
    }
}

export async function DELETE(
    req: Request,
    {params}: { params: { id: string } }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    try {
        await deleteIncome(session.user.id, params.id)
        return NextResponse.json({success: true})
    } catch (error) {
        console.error(error)
        return NextResponse.json({error: "Failed to delete income"}, {status: 500})
    }
}