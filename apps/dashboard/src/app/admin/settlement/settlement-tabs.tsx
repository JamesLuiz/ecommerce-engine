"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { formatNaira } from "@lib/referral-rules"
import type { ReferralSettlementRowView } from "@lib/referral-view"

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"

export function SettlementTabs({ rows }: { rows: ReferralSettlementRowView[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<"unsettled" | "settled">("unsettled")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null)

  const unsettledRows = rows.filter((row) => row.unsettledReferrals > 0)
  const settledRows = rows.filter((row) => row.settlements.length > 0)
  const visibleRows = tab === "unsettled" ? unsettledRows : settledRows

  const settle = async (row: ReferralSettlementRowView) => {
    setPendingId(row.enrollmentId)
    setFeedback(null)

    try {
      const response = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: row.enrollmentId,
          paymentReference: paymentReferences[row.enrollmentId] ?? "",
          notes: notes[row.enrollmentId] ?? "",
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean }

      if (!response.ok || !data.ok) {
        setFeedback({ kind: "error", message: data.error ?? "Could not mark this payout as settled." })
        return
      }

      setFeedback({
        kind: "success",
        message: `${row.name} was marked as settled for ${formatNaira(row.unsettledMinor)}.`,
      })
      setExpanded(null)
      setPaymentReferences((current) => ({ ...current, [row.enrollmentId]: "" }))
      setNotes((current) => ({ ...current, [row.enrollmentId]: "" }))
      router.refresh()
    } catch (cause) {
      setFeedback({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Could not mark this payout as settled.",
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setTab("unsettled")
            setExpanded(null)
            setFeedback(null)
          }}
          className={`px-5 py-3 text-sm font-medium ${
            tab === "unsettled"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Unsettled
          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
            {unsettledRows.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("settled")
            setExpanded(null)
            setFeedback(null)
          }}
          className={`px-5 py-3 text-sm font-medium ${
            tab === "settled"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Settled
          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            {settledRows.length}
          </span>
        </button>
      </div>

      <div className="p-5">
        {feedback ? (
          <p
            className={`mb-4 rounded-md px-4 py-3 text-sm ${
              feedback.kind === "error"
                ? "border border-red-200 bg-red-50 text-red-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        {visibleRows.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            {tab === "unsettled"
              ? "No enrollees have unsettled referral bonuses."
              : "No referral bonuses have been settled yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleRows.map((row) => {
              const isOpen = expanded === row.enrollmentId
              const isPending = pendingId === row.enrollmentId

              return (
                <article key={row.enrollmentId} className="rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.enrollmentId)}
                    aria-expanded={isOpen}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 text-left hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{row.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Referrals</p>
                        <p className="font-medium">
                          {tab === "unsettled" ? row.unsettledReferrals : row.totalReferrals}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {tab === "unsettled" ? "Amount due" : "Total paid"}
                        </p>
                        <p className="font-medium">
                          {formatNaira(tab === "unsettled" ? row.unsettledMinor : row.settledMinor)}
                        </p>
                      </div>
                      <span className="text-gray-400">{isOpen ? "−" : "+"}</span>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-gray-200 bg-gray-50/60 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border border-gray-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Payout account
                          </p>
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Bank</dt>
                              <dd className="font-medium">{row.bankName}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Account number</dt>
                              <dd className="font-mono font-medium">{row.accountNumber}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Enrolled</dt>
                              <dd>{formatDate(row.joinedAt)}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-md border border-gray-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Bonus summary
                          </p>
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">All-time referrals</dt>
                              <dd>{row.totalReferrals}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Total earned</dt>
                              <dd>{formatNaira(row.totalEarnedMinor)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Settled</dt>
                              <dd>{formatNaira(row.settledMinor)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-gray-500">Unsettled</dt>
                              <dd className="font-medium">{formatNaira(row.unsettledMinor)}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-md border border-gray-200 bg-white">
                        <p className="border-b border-gray-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Referrals and customer payment references
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="px-4 py-2 font-medium">Customer</th>
                                <th className="px-4 py-2 font-medium">Payment reference</th>
                                <th className="px-4 py-2 font-medium">Date</th>
                                <th className="px-4 py-2 text-right font-medium">Bonus</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.earnings.map((earning) => (
                                <tr key={earning.id} className="border-t border-gray-100">
                                  <td className="px-4 py-3">
                                    <p>{earning.customerName ?? "Customer"}</p>
                                    <p className="text-xs text-gray-500">{earning.customerEmail}</p>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">{earning.paymentReference}</td>
                                  <td className="px-4 py-3">{formatDate(earning.createdAt)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <p className="font-medium">{formatNaira(earning.amountMinor)}</p>
                                    <p
                                      className={`text-xs ${
                                        earning.settled ? "text-emerald-700" : "text-amber-700"
                                      }`}
                                    >
                                      {earning.settled ? "Settled" : "Pending"}
                                    </p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {tab === "settled" ? (
                        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Settlement history
                          </p>
                          <ul className="mt-3 flex flex-col gap-2 text-sm">
                            {row.settlements.map((settlement) => (
                              <li
                                key={settlement.id}
                                className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 first:border-0 first:pt-0"
                              >
                                <span>
                                  {formatDate(settlement.createdAt)} &middot; {settlement.settledBy}
                                  {settlement.paymentReference
                                    ? ` · ${settlement.paymentReference}`
                                    : ""}
                                  {settlement.notes ? ` · ${settlement.notes}` : ""}
                                </span>
                                <span className="font-medium">{formatNaira(settlement.amountMinor)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            void settle(row)
                          }}
                          className="mt-4 grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2"
                        >
                          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                            Transfer reference (optional)
                            <input
                              type="text"
                              maxLength={120}
                              value={paymentReferences[row.enrollmentId] ?? ""}
                              onChange={(event) =>
                                setPaymentReferences((current) => ({
                                  ...current,
                                  [row.enrollmentId]: event.target.value,
                                }))
                              }
                              className={inputClass}
                              placeholder="e.g. PAY-102938"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                            Notes (optional)
                            <input
                              type="text"
                              maxLength={500}
                              value={notes[row.enrollmentId] ?? ""}
                              onChange={(event) =>
                                setNotes((current) => ({
                                  ...current,
                                  [row.enrollmentId]: event.target.value,
                                }))
                              }
                              className={inputClass}
                              placeholder="Paid via bank transfer"
                            />
                          </label>
                          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                              This marks all {row.unsettledReferrals} unsettled bonuses as paid.
                            </p>
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                            >
                              {isPending ? "Marking..." : "Mark as settled"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
