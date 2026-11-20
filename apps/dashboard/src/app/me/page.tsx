import type { Metadata } from "next"
import Link from "next/link"

import { CopyLinkButton } from "../_components/copy-link-button"
import { findReferralByAccessToken, getReferralDashboard } from "@lib/referral"
import { formatNaira, REFERRAL_BONUS_MINOR } from "@lib/referral-rules"

export const metadata: Metadata = {
  title: "My referrals | Flowcheq Commerce",
  description: "Your referral earnings and referred stores.",
}

export const dynamic = "force-dynamic"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  )
}

export default async function MyReferralsPage(props: {
  searchParams: Promise<{ access?: string; token?: string }>
}) {
  const params = await props.searchParams
  const token = params.access ?? params.token ?? ""
  const enrollment = await findReferralByAccessToken(token)

  if (!enrollment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ef] px-6 py-16 text-neutral-900">
        <div className="w-full max-w-lg rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-[0_30px_80px_rgba(17,17,17,0.06)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Private link
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">This link is not valid.</h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            It may have been mistyped, or it is no longer active. Use the dashboard link you received
            when you enrolled.
          </p>
          <Link
            href="/referral"
            className="mt-8 inline-flex rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-medium text-white"
          >
            Join or recover a referral link
          </Link>
        </div>
      </main>
    )
  }

  const dashboard = await getReferralDashboard(enrollment)

  return (
    <main className="min-h-screen bg-[#f5f3ef] px-6 py-12 text-neutral-900 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link href="/" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
              Back to home
            </Link>
            <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              My referrals
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-5xl">
              Hello, {enrollment.name.split(" ")[0]}.
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              Joined {formatDate(dashboard.joinedAt)} &middot; {enrollment.email}
            </p>
          </div>

          <div className="w-full max-w-xl rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              Your referral link
            </p>
            <p className="mt-2 break-all font-mono text-xs text-neutral-800">{dashboard.referralUrl}</p>
            <CopyLinkButton
              value={dashboard.referralUrl}
              className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white"
            />
            <p className="mt-3 text-xs leading-5 text-neutral-500">
              Anyone who opens this link sees the normal sales page. Their purchase is credited to you.
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Earnings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.periods.map((period) => (
              <StatCard
                key={period.key}
                label={period.label}
                value={formatNaira(period.amountMinor)}
                hint={`${period.label.toLowerCase()} referrals`}
              />
            ))}
            <StatCard
              label="Total earned"
              value={formatNaira(dashboard.totalEarnedMinor)}
              hint="All time"
            />
            <StatCard label="Referrals" value={String(dashboard.totalReferrals)} hint="Successful stores" />
            <StatCard
              label="Awaiting settlement"
              value={formatNaira(dashboard.unsettledMinor)}
              hint={`Settled: ${formatNaira(dashboard.settledMinor)}`}
            />
          </div>
        </section>

        <section className="mt-12 rounded-[28px] border border-black/5 bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Recent referrals</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Each successful purchase adds a {formatNaira(REFERRAL_BONUS_MINOR)} bonus.
              </p>
            </div>
            {dashboard.settlements.length > 0 ? (
              <p className="text-xs text-neutral-500">
                Last payout: {formatDate(dashboard.settlements[0].createdAt)}
              </p>
            ) : null}
          </div>

          {dashboard.recent.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-[#f5f3ef] px-5 py-8 text-center text-sm text-neutral-600">
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                  <tr className="border-b border-black/10">
                    <th className="py-3 pr-4 font-medium">Customer</th>
                    <th className="py-3 pr-4 font-medium">Payment reference</th>
                    <th className="py-3 pr-4 font-medium">Date</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 text-right font-medium">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent.map((earning) => (
                    <tr key={earning.id} className="border-b border-black/5 last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-medium">{earning.customerName ?? "Customer"}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{earning.customerEmail}</p>
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs text-neutral-600">
                        {earning.paymentReference}
                      </td>
                      <td className="py-4 pr-4 text-neutral-600">{formatDate(earning.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            earning.settled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {earning.settled ? "Settled" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium">
                        {formatNaira(earning.amountMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-8 text-xs leading-5 text-neutral-500">
          Bonuses are paid manually by Flowcheq Commerce to the bank account you provided. This page is
          read-only; contact support if your bank details change.
        </p>
      </div>
    </main>
  )
}
