import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import {PrismaAdapter} from "@auth/prisma-adapter"
import {prisma} from "@/lib/prisma"

export const {
    handlers: {GET, POST},
    auth,
    signIn,
    signOut,
} = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {strategy: "database"},
    providers: [
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        }),
    ],
    callbacks: {
        session: async ({session, user}) => {
            if (session?.user) {
                session.user.id = user.id
                session.user.defaultCurrency =
                    (user as { defaultCurrency?: string }).defaultCurrency ?? "USD"
                session.user.themePreference =
                    (user as { themePreference?: string }).themePreference ?? "system"
                session.user.accentColor = (user as { accentColor?: string | null }).accentColor ?? null
                session.user.onboardingCompleted = (user as {
                    onboardingCompleted?: boolean
                }).onboardingCompleted ?? false
            }
            return session
        },
    },
})
