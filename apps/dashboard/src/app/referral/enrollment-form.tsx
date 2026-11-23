"use client"

import Link from "next/link"
import { useState } from "react"

import { CopyLinkButton } from "../_components/copy-link-button"
import { formatNaira } from "@lib/referral-rules"
import { SIX_MONTH_PLAN, YEARLY_PLAN } from "@lib/sales-plans"

const sixMonthBonus = formatNaira(SIX_MONTH_PLAN.referralBonusMinor)
const yearlyBonus = formatNaira(YEARLY_PLAN.referralBonusMinor)

interface EnrollResponse {
  ok?: boolean
  error?: string
  issues?: string[]
  alreadyEnrolled?: boolean
  name?: string
  referralUrl?: string
  meUrl?: string
}

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10"
const labelClass = "flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-600"

export function ReferralEnrollmentForm() {
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EnrollResponse | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/public/referrals/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, bankName, accountNumber }),
      })
      const data = (await response.json().catch(() => ({}))) as EnrollResponse

      if (!response.ok || !data.referralUrl || !data.meUrl) {
        const detail = [data.error, ...(data.issues ?? [])].filter(Boolean).join(" ")
        setError(detail || "Could not complete enrolment. Please try again.")
        return
      }

      setResult(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete enrolment. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (result?.referralUrl && result.meUrl) {
    return (
      <div className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_30px_80px_rgba(17,17,17,0.06)] md:p-9">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          {result.alreadyEnrolled ? "Welcome back" : "You are enrolled"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
          {result.alreadyEnrolled ? "Here are your links again." : "Your referral link is ready."}
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-600">
          Share the link below. When someone opens it and buys a store, you earn{" "}
          <strong className="font-semibold text-neutral-900">{sixMonthBonus}</strong> for a 6-month
          purchase or <strong className="font-semibold text-neutral-900">{yearlyBonus}</strong> for a
          yearly purchase.
        </p>

        <div className="mt-7 grid gap-4">
          <div className="rounded-2xl bg-[#f5f3ef] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Your referral link</p>
            <p className="mt-2 break-all font-mono text-sm text-neutral-800">{result.referralUrl}</p>
            <CopyLinkButton
              value={result.referralUrl}
              label="Copy referral link"
              className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white"
            />
          </div>

          <div className="rounded-2xl border border-black/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Your private dashboard</p>
            <p className="mt-2 break-all font-mono text-sm text-neutral-800">{result.meUrl}</p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Bookmark this link. It is the only way to view your earnings and referrals.
            </p>
            <CopyLinkButton
              value={result.meUrl}
              label="Copy dashboard link"
              className="mt-4 inline-flex rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            />
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-[var(--brand-primary)] hover:underline"
        >
          Back to the sales page
        </Link>
      </div>
    )
  }

  if (!formOpen) {
    return (
      <div className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_30px_80px_rgba(17,17,17,0.06)] md:p-9">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Get started
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Generate your referral program</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-neutral-600">
          Create your unique referral link and start earning {sixMonthBonus} for every 6-month store or{" "}
          {yearlyBonus} for every yearly store bought through it.
        </p>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-7 py-4 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Generate referral program
        </button>
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          You will provide your name, email, bank name and account number so we can credit and pay your bonuses.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_30px_80px_rgba(17,17,17,0.06)] md:p-9"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">Enrollment</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Create your referral account</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOpen(false)
            setError(null)
          }}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Back
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Full name
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="Adaeze Okafor"
            autoComplete="name"
            disabled={pending}
          />
        </label>

        <label className={labelClass}>
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={pending}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Bank name
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            className={inputClass}
            placeholder="Access Bank"
            autoComplete="off"
            disabled={pending}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Account number
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{10,16}"
            maxLength={16}
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))}
            className={`${inputClass} font-mono`}
            placeholder="0123456789"
            autoComplete="off"
            disabled={pending}
          />
          <span className="normal-case tracking-normal text-[11px] text-neutral-500">
            10 to 16 digits. Used only to pay your referral bonuses.
          </span>
        </label>

        {error ? (
          <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-7 py-4 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {pending ? "Creating your link..." : "Create referral link"}
          </button>
          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Your account number is encrypted at rest and is only shown to staff processing payouts.
            Each 6-month purchase earns {sixMonthBonus}; each yearly purchase earns {yearlyBonus}.
          </p>
        </div>
      </div>
    </form>
  )
}
