"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function SetupForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setPending(true)

    try {
      const response = await fetch("/api/staff/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        setError(data.error ?? "Could not create the account")
        return
      }

      // The response sets the session cookie; go straight into the dashboard.
      router.push("/admin")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the account")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-base border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="txt-compact-xlarge-plus mb-2 text-center">
          Create the first staff account
        </h1>
        <p className="txt-small-regular text-ui-fg-subtle mb-6 text-center">
          One-time setup for the Flowcheq Commerce control plane. This form is
          locked permanently once the first account exists.
        </p>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-small-regular">
            Name
            <input
              className="rounded-base border border-gray-200 px-3 py-2"
              type="text"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-small-regular">
            Email
            <input
              className="rounded-base border border-gray-200 px-3 py-2"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-small-regular">
            Password
            <span className="relative">
              <input
                className="w-full rounded-base border border-gray-200 px-3 py-2 pr-16"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
            <span className="text-ui-fg-subtle">At least 12 characters.</span>
          </label>
          <label className="flex flex-col gap-2 text-small-regular">
            Confirm password
            <input
              className="rounded-base border border-gray-200 px-3 py-2"
              type={showPassword ? "text" : "password"}
              name="confirm-password"
              autoComplete="new-password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error ? <p className="txt-small-regular text-red-600">{error}</p> : null}
          <button
            className="rounded-base bg-gray-900 px-4 py-2 text-small-regular text-white disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Create account and sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}
