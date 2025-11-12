type Bucket = {
    tokens: number
    updatedAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000)
const MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS ?? 120)

export function consumeToken(identifier: string, pathname: string) {
    const key = `${identifier}:${pathname}`
    const now = Date.now()
    const entry = buckets.get(key) ?? {tokens: MAX_REQUESTS, updatedAt: now}
    const elapsed = now - entry.updatedAt

    if (elapsed > WINDOW) {
        entry.tokens = MAX_REQUESTS
        entry.updatedAt = now
    }

    if (entry.tokens <= 0) {
        const retryAfter = Math.ceil((WINDOW - elapsed) / 1000)
        return {success: false, retryAfter}
    }

    entry.tokens -= 1
    buckets.set(key, entry)
    return {success: true}
}
