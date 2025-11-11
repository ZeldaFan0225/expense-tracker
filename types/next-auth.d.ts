import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      defaultCurrency: string
      themePreference?: string | null
      accentColor?: string | null
      onboardingCompleted?: boolean
    }
  }

  interface User {
    defaultCurrency?: string
    themePreference?: string
    accentColor?: string | null
    onboardingCompleted?: boolean
  }
}
