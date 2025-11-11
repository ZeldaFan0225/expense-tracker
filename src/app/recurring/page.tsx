import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { listRecurringExpenses } from "@/lib/services/recurring-expense-service"
import { ensureDefaultCategories, listCategories } from "@/lib/services/category-service"
import { RecurringManager } from "@/components/recurring/recurring-manager"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function RecurringPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  await ensureDefaultCategories(session.user.id)
  const [templatesRaw, categories] = await Promise.all([
    listRecurringExpenses(session.user.id),
    listCategories(session.user.id),
  ])
  const templates = templatesRaw.map((template) => ({
    ...template,
    lastGeneratedOn: template.lastGeneratedOn
      ? template.lastGeneratedOn.toISOString()
      : null,
  }))

  return (
    <DashboardShell
      heading="Recurring expenses"
      description="Automate predictable burn with split-by logic."
      user={session.user}
    >
      <GuidedSteps
        storageKey="recurring-guided"
        steps={[
          {
            title: "Add a template",
            description: "Describe the expense, set amount, and choose the due day of month.",
          },
          {
            title: "Split the impact",
            description: "Use split-by to divide costs across members or categories automatically.",
          },
          {
            title: "Pause when needed",
            description: "Toggle templates off without deleting them to stop future generations.",
          },
        ]}
      />
      <RecurringManager
        templates={templates}
        categories={categories}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
