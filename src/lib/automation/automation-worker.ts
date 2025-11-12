import {prisma} from "@/lib/prisma"
import {materializeRecurringExpenses, materializeRecurringIncomes,} from "@/lib/recurring"

const DEFAULT_INTERVAL_MS = 1000 * 60 * 5
const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS ?? DEFAULT_INTERVAL_MS)

function log(message: string, ...optional: unknown[]) {
    if (process.env.NODE_ENV !== "production") {
        console.log(`[automation] ${message}`, ...optional)
    }
}

let tickTimer: NodeJS.Timeout | null = null
let isRunning = false
let shuttingDown = false

async function runCycle() {
    if (isRunning) return
    isRunning = true

    try {
        const users = await prisma.user.findMany({
            select: {id: true},
            where: {
                OR: [
                    {recurringExpenses: {some: {isActive: true}}},
                    {recurringIncomes: {some: {isActive: true}}},
                ],
            },
        })

        if (users.length) {
            log(`running automation for ${users.length} user(s)`)

            for (const user of users) {
                try {
                    await materializeRecurringExpenses(user.id)
                    await materializeRecurringIncomes(user.id)
                } catch (error) {
                    console.error(
                        `[automation] failed to process user ${user.id}`,
                        error
                    )
                }
            }
        }

        await revokeExpiredApiKeys()

        log("automation cycle completed")
    } catch (error) {
        console.error("[automation] cycle failed", error)
    } finally {
        isRunning = false
    }
}

async function revokeExpiredApiKeys() {
    try {
        const now = new Date()
        const result = await prisma.apiKey.updateMany({
            where: {
                revokedAt: null,
                expiresAt: {
                    lt: now,
                },
            },
            data: {revokedAt: now},
        })
        if (result.count) {
            log(`revoked ${result.count} expired API key(s)`)
        }
    } catch (error) {
        console.error("[automation] failed to revoke expired API keys", error)
    }
}

async function start() {
    log(
        `worker online (pid=${process.pid}, interval=${intervalMs}ms)`
    )

    await runCycle()
    tickTimer = setInterval(runCycle, intervalMs)
}

async function shutdown(signal?: string) {
    if (shuttingDown) return
    shuttingDown = true
    if (tickTimer) {
        clearInterval(tickTimer)
    }
    log(`shutting down${signal ? ` (${signal})` : ""}`)
    try {
        await prisma.$disconnect()
    } catch (error) {
        console.error("[automation] prisma disconnect failed", error)
    } finally {
        process.exit(0)
    }
}

process.on("SIGTERM", () => {
    void shutdown("SIGTERM")
})

process.on("SIGINT", () => {
    void shutdown("SIGINT")
})

process.on("message", (message) => {
    if (message === "shutdown") {
        void shutdown("SHUTDOWN")
    }
})

void start().catch((error) => {
    console.error("[automation] failed to start worker", error)
    process.exit(1)
})
