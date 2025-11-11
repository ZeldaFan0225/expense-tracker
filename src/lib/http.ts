import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiAuthError, RateLimitError } from "@/lib/api-auth"

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function handleApiError(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Retry-After": String(error.retryAfter),
        },
      }
    )
  }

  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.issues.map((issue) => ({
          path: issue.path.join(".") || "root",
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  console.error(error)
  return NextResponse.json(
    { error: "Internal Server Error" },
    { status: 500 }
  )
}
