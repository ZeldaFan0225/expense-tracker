import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { UserSettingsForm } from "@/components/settings/user-settings-form"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  return (
    <DashboardShell
      heading="Settings"
      description="Manage currency formatting and accent colors."
      user={session.user}
    >
      <GuidedSteps
        storageKey="settings-guided"
        steps={[
          {
            title: "Tune currencies",
            description: "Change the default currency to update every chart and summary instantly.",
          },
          {
            title: "Pick an accent",
            description: "Accent colors feed chart palettes, highlights, and the sidebar accent.",
          },
          {
            title: "Revisit onboarding",
            description: "Need the guided flow again? You can reset via support or request access.",
          },
        ]}
      />
      <UserSettingsForm
        defaultCurrency={session.user.defaultCurrency}
        accentColor={session.user.accentColor}
      />
    </DashboardShell>
  )
}
