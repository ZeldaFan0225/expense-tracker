import type {NextRequest} from "next/server"
import {NextResponse} from "next/server"

const securityHeaders = [
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    ["X-DNS-Prefetch-Control", "on"],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
    [
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()",
    ],
]

const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
].join("; ")

export function middleware(request: NextRequest) {
    const response = NextResponse.next()

    response.headers.set("Content-Security-Policy", csp)
    for (const [key, value] of securityHeaders) {
        response.headers.set(key, value)
    }

    return response
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
