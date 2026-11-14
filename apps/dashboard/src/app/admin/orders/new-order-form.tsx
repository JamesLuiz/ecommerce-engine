"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface CustomerOption {
  id: string
  email: string
  name: string | null
}

interface PlanOption {
  id: string
  name: string
  price_minor: number
  currency: string
}

interface NewOrderFormProps {
  customers: CustomerOption[]
  plans: PlanOption[]
}

const REGIONS = ["ng", "us", "eu"] as const
const CURRENCIES = ["NGN", "USD", "EUR"] as const

type Region = (typeof REGIONS)[number]
type Currency = (typeof CURRENCIES)[number]

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

function randomReference() {
  return `manual_${Math.random().toString(36).slice(2, 10)}`
}

export function NewOrderForm({ customers, plans }: NewOrderFormProps) {
  const router = useRouter()
  const firstPlan = plans[0]
  const [customerId, setCustomerId] = useState("")
  const [planId, setPlanId] = useState(firstPlan?.id ?? "")
  const [amount, setAmount] = useState(
    firstPlan ? (firstPlan.price_minor / 100).toString() : ""
  )
  const [currency, setCurrency] = useState<Currency>(
    (CURRENCIES as readonly string[]).includes(firstPlan?.currency ?? "")
      ? ((firstPlan?.currency ?? "NGN") as Currency)
      : "NGN"
  )
  const [status, setStatus] = useState<"pending" | "paid">("pending")
  const [providerReference, setProviderReference] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [region, setRegion] = useState<Region>("ng")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onPlanChange = (value: string) => {
    setPlanId(value)

    const plan = plans.find((option) => option.id === value)

    if (plan) {
      setAmount((plan.price_minor / 100).toString())

      if ((CURRENCIES as readonly string[]).includes(plan.currency)) {
        setCurrency(plan.currency as Currency)
      }
    }
  }

  const onBusinessNameChange = (value: string) => {
    setBusinessName(value)

    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  const resetForm = () => {
    setBusinessName("")
    setSlug("")
    setSlugTouched(false)
    setProviderReference("")
    setStatus("pending")
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    setMessage(null)

    const customer = customers.find((option) => option.id === customerId)

    if (!customer) {
      setError("Select a customer.")
      setPending(false)
      return
    }

    if (!planId) {
      setError("Select a plan.")
      setPending(false)
      return
    }

    const amountMinor = Math.round(Number(amount) * 100)

    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError("Enter an amount greater than zero.")
      setPending(false)
      return
    }

    const body = {
      customer_id: customer.id,
      plan_id: planId,
      provider: "paystack",
      provider_reference: providerReference.trim() || randomReference(),
      amount_minor: amountMinor,
      currency,
      status,
      signup_payload: {
        slug,
        businessName,
        ownerEmail: customer.email,
        plan: planId,
        currency,
        region,
      },
    }

    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        issues?: string[]
        provisioning?: { jobId?: string } | null
      }

      if (!response.ok) {
        setError([data.error ?? "Could not create the order", ...(data.issues ?? [])].join(" "))

        return
      }

      setMessage(
        data.provisioning?.jobId
          ? `Order created and provisioning queued (job ${data.provisioning.jobId}).`
          : "Order created."
      )
      resetForm()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the order")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Customer
        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
          required
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name ? `${customer.name} <${customer.email}>` : customer.email}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Plan
        <select
          value={planId}
          onChange={(event) => onPlanChange(event.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
          required
        >
          {plans.length === 0 ? <option value="">No plans configured</option> : null}
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} ({plan.id})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Amount (major units)
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Currency
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
        >
          {CURRENCIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "pending" | "paid")}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
        >
          <option value="pending">pending</option>
          <option value="paid">paid (deploy now)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Region
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value as Region)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          disabled={pending}
        >
          {REGIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Business name
        <input
          type="text"
          minLength={2}
          maxLength={80}
          value={businessName}
          onChange={(event) => onBusinessNameChange(event.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-900"
          placeholder="Acme Stores"
          disabled={pending}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Store slug
        <input
          type="text"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true)
            setSlug(event.target.value)
          }}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 font-mono text-sm font-normal text-gray-900"
          placeholder="acme-stores"
          pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]"
          title="3-32 lowercase letters, numbers and hyphens"
          disabled={pending}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Provider reference
        <input
          type="text"
          value={providerReference}
          onChange={(event) => setProviderReference(event.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 font-mono text-sm font-normal text-gray-900"
          placeholder="auto-generated when empty"
          disabled={pending}
        />
      </label>

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={pending || plans.length === 0 || customers.length === 0}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create order"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
      </div>
    </form>
  )
}
