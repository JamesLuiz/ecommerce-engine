"use client"

import { useState } from "react"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export default function PurchaseForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onBusinessNameChange = (value: string) => {
    setBusinessName(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, businessName, slug }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        issues?: string[]
        detail?: string
        authorization_url?: string
      }

      if (!response.ok || !data.authorization_url) {
        const detail = [data.error, data.detail, ...(data.issues ?? [])].filter(Boolean).join(" ")
        setError(detail || "Could not start payment. Please try again.")
        return
      }

      window.location.href = data.authorization_url
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start payment. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none ring-0 transition focus:border-white/30 focus:bg-white/10"
  const labelClass = "flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/60"

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Your name
        <input
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@business.com"
          autoComplete="email"
          disabled={pending}
        />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Business name
        <input
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={businessName}
          onChange={(e) => onBusinessNameChange(e.target.value)}
          className={inputClass}
          placeholder="Acme Stores"
          autoComplete="organization"
          disabled={pending}
        />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Store name (URL slug)
        <input
          type="text"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          className={`${inputClass} font-mono`}
          placeholder="acme-stores"
          pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
          title="3-32 lowercase letters, numbers and hyphens"
          disabled={pending}
        />
        <span className="normal-case tracking-normal text-[11px] text-white/40">
          Lowercase letters, numbers and hyphens. This becomes your store address.
        </span>
      </label>

      {error ? (
        <p className="sm:col-span-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="sm:col-span-2 flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-medium text-neutral-900 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? "Redirecting to payment..." : "Pay ₦150,000 and get my store"}
        </button>
        <p className="text-xs leading-5 text-white/50">
          Secure payment via Paystack. We&apos;ll log your order and begin setup within 24 hours
          after payment and receiving your details.
        </p>
      </div>
    </form>
  )
}
