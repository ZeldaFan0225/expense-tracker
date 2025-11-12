import type {Session} from "next-auth"
import {redirect} from "next/navigation"

export function requireOnboardingCompletion(session: Session | null) {
    if (session?.user && !session.user.onboardingCompleted) {
        redirect("/onboarding")
    }
}
