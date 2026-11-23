"use client"

import { Text } from "@modules/common/components/ui"
import { useEffect, useState } from "react"

type ManualSettlementAccount = {
  bank_name: string
  account_name: string
  account_number: string
  account_number_last4: string
}

const ManualPaymentDetails = () => {
  const [account, setAccount] = useState<ManualSettlementAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/manual-settlement", { cache: "no-store" })
        const data = (await response.json()) as {
          account?: ManualSettlementAccount | null
        }

        setAccount(response.ok ? (data.account ?? null) : null)
      } catch {
        setAccount(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  if (loading) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        Loading manual payment details...
      </Text>
    )
  }

  if (!account) {
    return (
      <div className="my-4 rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
        <Text size="small" className="text-ui-fg-error">
          Manual payment is not configured for this store. Choose another payment method.
        </Text>
      </div>
    )
  }

  return (
    <div className="my-4 rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
      <Text size="small" weight="plus" className="text-ui-fg-base">
        Pay by direct bank transfer
      </Text>
      <Text size="small" className="text-ui-fg-subtle mt-1">
        Transfer your order total to the account below, then upload your receipt on the next step.
      </Text>
      <div className="mt-3 grid gap-1">
        <Text size="small">
          <span className="text-ui-fg-subtle">Bank: </span>
          {account.bank_name}
        </Text>
        <Text size="small">
          <span className="text-ui-fg-subtle">Account name: </span>
          {account.account_name}
        </Text>
        <Text size="small">
          <span className="text-ui-fg-subtle">Account number: </span>
          <span className="font-mono font-semibold" data-testid="manual-account-number">
            {account.account_number}
          </span>
        </Text>
      </div>
    </div>
  )
}

export default ManualPaymentDetails
