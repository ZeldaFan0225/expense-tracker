import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {CsvImportForm} from "@/components/import/csv-import-form"
import {ImportScheduleManager} from "@/components/import/import-schedule-manager"
import {listImportSchedules} from "@/lib/services/import-service"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function ImportPage() {
    const session = await auth()
    if (!session?.user) redirect("/")

    requireOnboardingCompletion(session)

    const schedules = await listImportSchedules(session.user.id)

    return (
        <DashboardShell
            heading="Import CSV"
            description="Preview, edit, and automate recurring uploads."
            user={session.user}
        >
            <GuidedSteps
                storageKey="import-guided"
                steps={[
                    {
                        title: "Upload + preview",
                        description: "Drop a CSV to map columns, tweak rows inline, and validate before posting.",
                    },
                    {
                        title: "Fix categories fast",
                        description: "Auto-create categories or pick existing ones directly in the preview grid.",
                    },
                    {
                        title: "Schedule recurring pulls",
                        description: "Use import schedules to fetch files on a cadence and post automatically.",
                    },
                ]}
            />
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <CsvImportForm/>
                <ImportScheduleManager initialSchedules={schedules}/>
            </div>
        </DashboardShell>
    )
}
