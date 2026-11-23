import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { NextResponse } from "next/server"

export type ManualSettlementAccount = {
  bank_name: string
  account_name: string
  account_number: string
  account_number_last4: string
}

export async function GET() {
  try {
    const data = await sdk.client.fetch<{ account: ManualSettlementAccount | null }>(
      "/store/manual-settlement",
      {
        method: "GET",
        headers: { ...(await getAuthHeaders()) },
        cache: "no-store",
      },
    )

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        account: null,
        error: "Manual payment details could not be loaded.",
      },
      { status: 502 },
    )
  }
}
