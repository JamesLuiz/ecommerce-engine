"use client"

import { MANUAL_PAYMENT_RECEIVED_MESSAGE } from "@lib/payment-status"
import { HttpTypes } from "@medusajs/types"
import { Button, Input, Text } from "@modules/common/components/ui"
import { useParams } from "next/navigation"
import React, { useState } from "react"
import ErrorMessage from "../error-message"
import ManualPaymentDetails from "../manual-payment-details"

type ManualPaymentButtonProps = {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}

const readError = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.message || data.error?.message || "We couldn't submit your receipt."
  } catch {
    return "We couldn't submit your receipt."
  }
}

const ManualPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: ManualPaymentButtonProps) => {
  const { countryCode } = useParams()
  const [showUpload, setShowUpload] = useState(false)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submitReceipt = async () => {
    if (!receipt) {
      setErrorMessage("Choose your payment receipt first.")
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const body = new FormData()
      body.set("cart_id", cart.id)
      body.set("receipt", receipt)

      const response = await fetch("/api/manual-payment", {
        method: "POST",
        body,
      })

      if (!response.ok) {
        setErrorMessage(await readError(response))
        return
      }

      const data = (await response.json()) as {
        order_id?: string | null
        message?: string
      }

      if (!data.order_id) {
        setErrorMessage("We couldn't find your order. Please contact the store.")
        return
      }

      const query = new URLSearchParams({
        payment: "manual_pending",
        message: data.message || MANUAL_PAYMENT_RECEIVED_MESSAGE,
      })

      // A full document navigation avoids reusing cached checkout RSC payloads
      // that still contain the now-completed cart.
      const confirmationUrl = new URL(
        `/${countryCode}/order/${data.order_id}/confirmed?${query.toString()}`,
        window.location.origin,
      )

      window.location.assign(confirmationUrl.toString())
    } catch {
      setErrorMessage("We couldn't submit your receipt. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4">
      <ManualPaymentDetails />

      {!showUpload ? (
        <Button
          disabled={notReady}
          size="large"
          onClick={() => setShowUpload(true)}
          data-testid={dataTestId}
        >
          I&apos;ve paid
        </Button>
      ) : (
        <div className="grid gap-3">
          <div>
            <Text size="small" className="text-ui-fg-subtle mb-2 block">
              Upload the receipt or payment confirmation you received from your bank.
            </Text>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setErrorMessage(null)
                setReceipt(event.target.files?.[0] ?? null)
              }}
              data-testid="manual-receipt-input"
            />
          </div>
          <div className="flex gap-3">
            <Button
              size="large"
              isLoading={submitting}
              disabled={notReady || !receipt || submitting}
              onClick={() => void submitReceipt()}
              data-testid="manual-receipt-submit"
            >
              Submit receipt
            </Button>
            <Button
              size="large"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setShowUpload(false)
                setReceipt(null)
                setErrorMessage(null)
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      <ErrorMessage error={errorMessage} data-testid="manual-payment-error-message" />
    </div>
  )
}

export default ManualPaymentButton
