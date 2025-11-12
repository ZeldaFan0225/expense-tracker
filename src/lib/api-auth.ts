import type {ApiScope} from "@prisma/client"
import {prisma} from "@/lib/prisma"
import {parseApiKeyToken, verifyApiKeySecret} from "@/lib/api-keys"
import {auth} from "@/lib/auth-server"
import {consumeToken} from "@/lib/rate-limit"

type AuthenticatedUser = {
    defaultCurrency: string
}

export type AuthContext = {
    userId: string
    source: "session" | "api-key"
    scopes: ApiScope[]
    user: AuthenticatedUser
}

export class ApiAuthError extends Error {
    status: number

    constructor(message: string, status = 401) {
        super(message)
        this.status = status
    }
}

export class RateLimitError extends Error {
    status = 429
    retryAfter: number

    constructor(retryAfter: number) {
        super("Too many requests")
        this.retryAfter = retryAfter
    }
}

export async function authenticateRequest(
    request: Request,
    requiredScopes: ApiScope[] = []
): Promise<AuthContext> {
    const apiKeyHeader =
        request.headers.get("x-api-key") ?? request.headers.get("X-API-Key")

    const url = new URL(request.url)

    if (apiKeyHeader) {
        const parsed = parseApiKeyToken(apiKeyHeader)
        if (!parsed) {
            throw new ApiAuthError("Invalid API key format")
        }

        const apiKey = await prisma.apiKey.findFirst({
            where: {prefix: parsed.prefix},
            include: {
                user: {
                    select: {defaultCurrency: true},
                },
            },
        })

        if (!apiKey) {
            throw new ApiAuthError("API key not found")
        }

        if (apiKey.revokedAt) {
            throw new ApiAuthError("API key has been revoked", 403)
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            throw new ApiAuthError("API key expired", 403)
        }

        const valid = await verifyApiKeySecret(parsed.secret, apiKey.hashedSecret)
        if (!valid) {
            throw new ApiAuthError("API key invalid")
        }

        const missingScopes = requiredScopes.filter(
            (scope) => !apiKey.scopes.includes(scope)
        )
        if (missingScopes.length) {
            throw new ApiAuthError("API key scope insufficient", 403)
        }

        const limiter = consumeToken(`key:${apiKey.prefix}`, url.pathname)
        if (!limiter.success) {
            throw new RateLimitError(limiter.retryAfter ?? 60)
        }

        return {
            userId: apiKey.userId,
            source: "api-key",
            scopes: apiKey.scopes,
            user: {
                defaultCurrency: apiKey.user?.defaultCurrency ?? "USD",
            },
        }
    }

    const session = await auth()
    if (!session?.user?.id) {
        throw new ApiAuthError("Unauthorized")
    }

    const limiter = consumeToken(`user:${session.user.id}`, url.pathname)
    if (!limiter.success) {
        throw new RateLimitError(limiter.retryAfter ?? 60)
    }

    return {
        userId: session.user.id,
        source: "session",
        scopes: [
            "expenses_read",
            "expenses_write",
            "analytics_read",
            "income_write",
            "budget_read",
        ],
        user: {
            defaultCurrency: session.user.defaultCurrency ?? "USD",
        },
    }
}
