"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const response = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    setPending(false)

    if (!response.ok) {
      setError("Invalid email or password")
      return
    }

    router.push("/admin")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-base border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="txt-compact-xlarge-plus mb-2 text-center">Staff login</h1>
        <p className="txt-small-regular text-ui-fg-subtle mb-6 text-center">
          Flowcheq Commerce control plane.
        </p>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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
            <input
              className="rounded-base border border-gray-200 px-3 py-2"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="txt-small-regular text-red-600">{error}</p> : null}
          <button
            className="rounded-base bg-gray-900 px-4 py-2 text-small-regular text-white disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}
