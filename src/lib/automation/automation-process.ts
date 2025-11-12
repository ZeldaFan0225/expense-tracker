import {type ChildProcess, spawn} from "node:child_process"
import path from "node:path"

declare global {
    // eslint-disable-next-line no-var
    var __automationProcess: ChildProcess | undefined
}

const RESTART_DELAY_MS = Number(process.env.AUTOMATION_RESTART_DELAY_MS ?? 10_000)

function isServerRuntime() {
    return typeof window === "undefined"
}

function isAutomationEnabled() {
    if (process.env.AUTOMATION_DISABLED === "1") return false
    if (process.env.NODE_ENV === "test") return false
    if (process.env.NEXT_RUNTIME === "edge") return false
    if (process.env.JEST_WORKER_ID) return false
    return true
}

let shuttingDown = false
let restartTimer: NodeJS.Timeout | null = null
let cleanupListenersRegistered = false

function cleanupPreviousProcess() {
    if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
    }
    if (globalThis.__automationProcess && !globalThis.__automationProcess.killed) {
        globalThis.__automationProcess.kill()
    }
    globalThis.__automationProcess = undefined
}

export function ensureAutomationProcess() {
    if (!isServerRuntime()) return
    if (!isAutomationEnabled()) return
    if (globalThis.__automationProcess) return

    const workerPath = path.resolve(process.cwd(), "src/lib/automation/automation-worker.ts")
    const tsxCli = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs")

    const child = spawn(process.execPath, [tsxCli, workerPath], {
        env: {
            ...process.env,
            AUTOMATION_PARENT_PID: String(process.pid),
        },
        stdio: process.env.NODE_ENV === "development" ? "inherit" : "ignore",
    })

    globalThis.__automationProcess = child

    if (!cleanupListenersRegistered) {
        cleanupListenersRegistered = true
        const handleExit = () => {
            shuttingDown = true
            cleanupPreviousProcess()
        }
        process.once("exit", handleExit)
        process.once("SIGINT", handleExit)
        process.once("SIGTERM", handleExit)
    }

    child.on("exit", (code, signal) => {
        if (shuttingDown) {
            cleanupPreviousProcess()
            return
        }

        cleanupPreviousProcess()

        if (!isAutomationEnabled()) {
            return
        }

        restartTimer = setTimeout(() => {
            shuttingDown = false
            ensureAutomationProcess()
        }, RESTART_DELAY_MS)

        if (process.env.NODE_ENV !== "production") {
            console.warn(
                `[automation] worker exited (code=${code ?? "null"}, signal=${signal ?? "null"}). Restart scheduled in ${RESTART_DELAY_MS}ms.`
            )
        }
    })

    child.on("error", (error) => {
        console.error("[automation] worker process error", error)
    })
}
