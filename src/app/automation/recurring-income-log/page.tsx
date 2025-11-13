import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {listMaterializedRecurringIncome} from "@/lib/services/income-service"
import {RecurringIncomeLog} from "@/components/income/recurring-income-log"
import {requireOnboardingCompletion} from "@/lib/onboarding"

export const dynamic = "force-dynamic"

export default async function RecurringIncomeLogPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/")
    }

    requireOnboardingCompletion(session)

    const incomes = await listMaterializedRecurringIncome(session.user.id)

    return (
        <DashboardShell
            heading="Recurring Income Log"
            description="View and manage recurring income that has been posted to your account."
            user={session.user}
        >
            <RecurringIncomeLog
                initialIncomes={incomes}
                currency={session.user.defaultCurrency}
            />
        </DashboardShell>
    )
}
