import { redirect } from "next/navigation"

import { staffAccountExists } from "@lib/staff"
import LoginForm from "./login-form"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  // Fresh deployment: the first staff account must be created before anyone
  // can sign in, so every visit lands on the setup form.
  if (!(await staffAccountExists())) {
    redirect("/setup")
  }

  return <LoginForm />
}
