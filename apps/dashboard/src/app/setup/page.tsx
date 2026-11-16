import { staffAccountExists } from "@lib/staff"
import LoginForm from "../login/login-form"
import SetupForm from "./setup-form"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  const hasStaff = await staffAccountExists()

  // After setup this route renders the login form instead, so probing /setup
  // reveals nothing about whether the first account exists.
  if (hasStaff) {
    return <LoginForm />
  }

  return <SetupForm />
}
