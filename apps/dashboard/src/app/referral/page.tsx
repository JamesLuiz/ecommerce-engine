import type { Metadata } from "next"
import Link from "next/link"

import { formatNaira, REFERRAL_BONUS_MINOR } from "@lib/referral-rules"
import { ReferralEnrollmentForm } from "./enrollment-form"

export const metadata: Metadata = {
  title: "Referral program | Flowcheq Commerce",
  description: "Earn a bonus for every store you help Flowcheq Commerce set up.",
}

const points = [
  "Get a unique link to the Flowcheq sales page.",
  "Earn a bonus for every successful store purchase from your link.",
  "Track referrals and earnings on your private dashboard.",
  "Payments are settled manually to the bank account you provide.",
]

export default function ReferralPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ef] px-6 py-14 text-neutral-900 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <Link href="/" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
            Back to home
          </Link>
          <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
            Referral program
          </p>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.07em] md:text-6xl">
            Earn {formatNaira(REFERRAL_BONUS_MINOR)} for every store you help us set up.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
            Know a business owner who needs an online store? Share your link. When they buy a store
            through it, we credit your referral account automatically.
          </p>

          <ul className="mt-10 grid gap-3">
            {points.map((point) => (
              <li
                key={point}
                className="rounded-2xl border border-black/5 bg-white/60 px-5 py-4 text-sm leading-6 text-neutral-700"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

        <ReferralEnrollmentForm />
      </div>
    </main>
  )
}
