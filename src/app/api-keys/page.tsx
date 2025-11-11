import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { listApiKeys } from "@/lib/services/api-key-service"
import { ApiKeysManager } from "@/components/api-keys/api-keys-manager"
import { scopesToStrings } from "@/lib/api-keys"
import { requireOnboardingCompletion } from "@/lib/onboarding"
import { GuidedSteps } from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  const rawKeys = await listApiKeys(session.user.id)
  const keys = rawKeys.map((key) => ({
    id: key.id,
    prefix: key.prefix,
    scopes: scopesToStrings(key.scopes),
    createdAt: key.createdAt.toISOString(),
    revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    description: key.description ?? null,
  }))

  return (
    <DashboardShell
      heading="API keys"
      description="Scoped tokens with hashed storage and rate limits."
      user={session.user}
    >
      <GuidedSteps
        storageKey="api-keys-guided"
        steps={[
          {
            title: "Create with intent",
            description: "Generate a key per integration and limit scopes to only what it needs.",
          },
          {
            title: "Copy once",
            description: "We only show the raw secret at creation; copy or download it immediately.",
          },
          {
            title: "Revoke when done",
            description: "Use the inline revoke/delete actions to expire compromised or old keys.",
          },
        ]}
      />
      <ApiKeysManager keys={keys} />
    </DashboardShell>
  )
}
