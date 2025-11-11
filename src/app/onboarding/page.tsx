import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { prisma } from "@/lib/prisma"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const [expenseCount, incomeCount, recurringIncomeCount, apiKeyCount] = await Promise.all([
    prisma.expense.count({ where: { userId: session.user.id } }),
    prisma.income.count({ where: { userId: session.user.id } }),
    prisma.recurringIncome.count({ where: { userId: session.user.id } }),
    prisma.apiKey.count({ where: { userId: session.user.id } }),
  ])
  const hasIncomeSetup = incomeCount > 0 || recurringIncomeCount > 0

  return (
    <DashboardShell
      heading="Guided onboarding"
      description="Dial in preferences, log your first entry, and preview API integrations."
      user={session.user}
    >
      <OnboardingFlow
        defaultCurrency={session.user.defaultCurrency}
        accentColor={session.user.accentColor}
        hasLoggedExpense={expenseCount > 0}
        hasIncomeSetup={hasIncomeSetup}
        hasApiKey={apiKeyCount > 0}
        onboardingCompleted={session.user.onboardingCompleted ?? false}
      />
    </DashboardShell>
  )
}
