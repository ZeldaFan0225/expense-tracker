import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import { userSettingsSchema } from "@/lib/validation"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.source !== "session") {
      return json({ error: "Settings can only be updated in-app." }, { status: 403 })
    }

    const body = await request.json()
    const parsed = userSettingsSchema.parse(body)
    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: parsed,
      select: {
        id: true,
        defaultCurrency: true,
        accentColor: true,
        onboardingCompleted: true,
      },
    })

    return json({ settings: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.source !== "session") {
      return json(
        { error: "Account deletion requires a signed-in session." },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id: auth.userId },
    })

    return json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
