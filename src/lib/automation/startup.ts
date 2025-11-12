import {ensureAutomationProcess} from "@/lib/automation/automation-process"

if (typeof window === "undefined") {
    ensureAutomationProcess()
}
