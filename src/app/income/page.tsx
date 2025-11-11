import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { listIncomeForRange } from "@/lib/services/income-service"
import { listRecurringIncomes } from "@/lib/services/recurring-income-service"
import { IncomeManager } from "@/components/income/income-manager"
import { RecurringIncomeManager } from "@/components/income/recurring-income-manager"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function IncomePage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [entriesRaw, templates] = await Promise.all([
    listIncomeForRange(session.user.id, { start, end: now }),
    listRecurringIncomes(session.user.id),
  ])
  const entries = entriesRaw.map((entry) => ({
    ...entry,
    occurredOn: entry.occurredOn.toISOString(),
  }))

  return (
    <DashboardShell
      heading="Income planning"
      description="Track one-off deposits and automate recurring inflows."
      user={session.user}
    >
      <GuidedSteps
        storageKey="income-guided"
        steps={[
          {
            title: "Template predictable income",
            description: "Add salaries or retainers as recurring income so forecasts stay current.",
          },
          {
            title: "Log ad-hoc entries",
            description: "Use the quick form for bonuses or reimbursements that land this month.",
          },
          {
            title: "Compare against expenses",
            description: "Keep an eye on the dashboard net chart to see how inflows offset burn.",
          },
        ]}
      />
      <RecurringIncomeManager
        templates={templates}
        currency={session.user.defaultCurrency}
      />
      <IncomeManager
        entries={entries.slice(0, 5)}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
