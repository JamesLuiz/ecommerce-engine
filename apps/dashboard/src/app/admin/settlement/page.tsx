import { getSettlementOverview } from "@lib/referral"
import { formatNaira } from "@lib/referral-rules"
import type { ReferralSettlementRowView } from "@lib/referral-view"
import { SettlementTabs } from "./settlement-tabs"

export const dynamic = "force-dynamic"

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

export default async function SettlementPage() {
  const overview = await getSettlementOverview()

  const rows: ReferralSettlementRowView[] = overview.rows.map((row) => ({
    enrollmentId: row.enrollmentId,
    name: row.name,
    email: row.email,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    joinedAt: row.joinedAt.toISOString(),
    totalReferrals: row.totalReferrals,
    unsettledReferrals: row.unsettledReferrals,
    totalEarnedMinor: row.totalEarnedMinor,
    unsettledMinor: row.unsettledMinor,
    settledMinor: row.settledMinor,
    earnings: row.earnings.map((earning) => ({
      id: earning.id,
      customerName: earning.customerName,
      customerEmail: earning.customerEmail,
      paymentReference: earning.paymentReference,
      amountMinor: earning.amountMinor,
      createdAt: earning.createdAt.toISOString(),
      settled: earning.settled,
    })),
    settlements: row.settlements.map((settlement) => ({
      id: settlement.id,
      amountMinor: settlement.amountMinor,
      paymentReference: settlement.paymentReference,
      notes: settlement.notes,
      settledBy: settlement.settledBy,
      createdAt: settlement.createdAt.toISOString(),
    })),
  }))

  const settledReferrals = overview.rows.reduce(
    (total, row) =>
      total + row.earnings.filter((earning) => earning.settled).length,
    0
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Referral settlement</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review enrolled referrers and mark their bonuses as paid after you transfer the funds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrolled referrers"
          value={overview.enrolledCount}
          hint="People in the referral program"
        />
        <StatCard label="Unpaid bonuses" value={formatNaira(overview.totalUnsettledMinor)} hint="Awaiting payout" />
        <StatCard label="Paid bonuses" value={formatNaira(overview.totalSettledMinor)} hint="All time" />
        <StatCard label="Settled referrals" value={settledReferrals} hint="Successful paid referrals" />
      </div>

      <SettlementTabs rows={rows} />
    </div>
  )
}
