import { Metadata } from "next"

import { getStoreName } from "@lib/util/site"
import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to your ${getStoreName()} account.`,
}

export default function Login() {
  return <LoginTemplate />
}
