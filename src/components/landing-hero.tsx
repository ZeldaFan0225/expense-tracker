"use client"

import { signIn } from "next-auth/react"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

export function LandingHero() {
  const handleSignIn = () => {
    void signIn("github", { callbackUrl: "/" })
  }

  return (
    <main className="bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
          <ShieldCheck className="size-4" />
          Zero-knowledge encrypted expenses
        </span>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Expense Flow keeps every transaction encrypted, automated, and audit
            ready.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
            Connect your GitHub account, track expenses and recurring income,
            and export compliant CSVs in seconds. Built for finance teams that
            value privacy.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSignIn}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-white/90"
          >
            Sign in with GitHub
            <ArrowRight className="ml-2 size-4" />
          </button>
          <a
            href="#learn-more"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 font-medium text-white/80 hover:border-white hover:text-white"
          >
            Learn more
          </a>
        </div>
        <div
          id="learn-more"
          className="grid w-full gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-left sm:grid-cols-3"
        >
          {[
            {
              title: "Encrypted storage",
              description:
                "AES-256-GCM on every monetary field with rotating keys.",
            },
            {
              title: "Realtime automation",
              description:
                "Recurring templates auto-generate expenses and income.",
            },
            {
              title: "API-first controls",
              description:
                "Scoped API keys with bcrypt hashing and per-route limits.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <Sparkles className="mb-3 size-5 text-emerald-400" />
              <p className="text-sm font-semibold text-white">
                {feature.title}
              </p>
              <p className="text-sm text-white/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
