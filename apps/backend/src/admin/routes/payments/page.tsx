import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { CreditCard, ArrowPath } from "@medusajs/icons"
import { useEffect, useMemo, useRef, useState } from "react"

type Transaction = {
  reference: string
  vendor_id: string
  external_ref: string | null
  amount: number
  currency: string
  status: string
  customer_email: string
  channel: string | null
  fees: number | null
  paid_at: string | null
  created_at: string
  net?: number
  gateway_response?: any
  refunds?: Array<any>
}

type Bank = {
  name: string
  code: string
}

type Settlement = {
  bank_code: string
  bank_name: string
  account_number_last4: string
  account_name: string
  status: string
  verified_at: string
}

type ManualAccount = {
  id: string
  bank_code: string
  bank_name: string
  account_name: string
  account_number: string
  account_number_last4: string
  enabled: boolean
  verified_at: string
}


type PaymentConfig = {
  provider: "paystack"
  mode: "platform" | "direct"
  enabled: boolean
  direct: {
    public_key: string
    secret_key_set: boolean
    secret_key_masked: string | null
    webhook_secret_set: boolean
    webhook_secret_masked: string | null
    ready: boolean
  }
  platform: {
    gateway_configured: boolean
  }
  links: {
    webhook_url: string
    callback_url: string
    provider_id: string
  }
}

const formatMoney = (kobo: number, currency = "NGN") => {
  const major = (kobo || 0) / 100
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(major)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const statusColor = (status: string): "green" | "red" | "orange" | "grey" => {
  switch (status) {
    case "success":
      return "green"
    case "failed":
      return "red"
    case "pending":
      return "orange"
    default:
      return "grey"
  }
}

const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = await res.json()
    return body?.error?.message ?? body?.message ?? fallback
  } catch {
    return fallback
  }
}

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div>
      <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 6, display: "block" }}>
        {label}
      </Text>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={value} readOnly style={{ fontFamily: "monospace", fontSize: 12 }} />
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          Copy
        </Button>
      </div>
    </div>
  )
}

const PaymentsPage = () => {
  const [activeTab, setActiveTab] = useState("configuration")

  // Provider config state
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [mode, setMode] = useState<"platform" | "direct">("platform")
  const [publicKey, setPublicKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [clearSecretKey, setClearSecretKey] = useState(false)
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false)

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ total_count: 0, total_amount_success: 0, total_fees: 0 })
  const [page, setPage] = useState(1)
  const [perPage] = useState(15)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoadingTx, setIsLoadingTx] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Settlement state
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [hasSettlement, setHasSettlement] = useState<boolean>(true)
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [bankSearch, setBankSearch] = useState("")
  const [selectedBankCode, setSelectedBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [resolvedAccountName, setResolvedAccountName] = useState("")
  const [resolveError, setResolveError] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  const [isSavingSettlement, setIsSavingSettlement] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [testMode, setTestMode] = useState<boolean | null>(null)
  const resolveRequestId = useRef(0)

  // Manual settlement state
  const [manualAccount, setManualAccount] = useState<ManualAccount | null>(null)
  const [manualBankSearch, setManualBankSearch] = useState("")
  const [manualBankCode, setManualBankCode] = useState("")
  const [manualAccountNumber, setManualAccountNumber] = useState("")
  const [manualResolvedAccountName, setManualResolvedAccountName] = useState("")
  const [manualResolveError, setManualResolveError] = useState("")
  const [manualIsResolving, setManualIsResolving] = useState(false)
  const [manualIsSaving, setManualIsSaving] = useState(false)
  const manualResolveRequestId = useRef(0)
  const [isLoadingManual, setIsLoadingManual] = useState(false)

  const bankOptions = useMemo(() => {
    const unique = Array.from(new Map(banks.map((bank): [string, Bank] => [bank.code, bank])).values())
    const query = bankSearch.trim().toLowerCase()
    if (!query) return unique
    return unique.filter(
      (bank) => bank.name.toLowerCase().includes(query) || bank.code.toLowerCase().includes(query)
    )
  }, [banks, bankSearch])

  const manualBankOptions = useMemo(() => {
    const unique = Array.from(new Map(banks.map((bank): [string, Bank] => [bank.code, bank])).values())
    const query = manualBankSearch.trim().toLowerCase()
    if (!query) return unique
    return unique.filter(
      (bank) => bank.name.toLowerCase().includes(query) || bank.code.toLowerCase().includes(query)
    )
  }, [banks, manualBankSearch])

  const fetchManualAccount = async () => {
    setIsLoadingManual(true)
    try {
      const res = await fetch("/admin/payment/manual-account", { credentials: "same-origin" })
      if (!res.ok) {
        toast.error(await readErrorMessage(res, "Failed to load manual settlement account"))
        return
      }

      const data = (await res.json()) as { account: ManualAccount | null }
      setManualAccount(data.account)
    } catch {
      toast.error("Failed to load manual settlement account")
    } finally {
      setIsLoadingManual(false)
    }
  }

  const fetchPaymentConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const res = await fetch("/admin/payment/config", { credentials: "same-origin" })
      if (!res.ok) {
        toast.error(await readErrorMessage(res, "Failed to load payment configuration"))
        return
      }
      const data = (await res.json()) as PaymentConfig
      setPaymentConfig(data)
      setMode(data.mode)
      setPublicKey(data.direct?.public_key || "")
      setSecretKey("")
      setWebhookSecret("")
      setClearSecretKey(false)
      setClearWebhookSecret(false)
    } catch {
      toast.error("Failed to load payment configuration")
    } finally {
      setIsLoadingConfig(false)
    }
  }

  useEffect(() => {
    void fetchPaymentConfig()
  }, [])

  const handleSaveConfig = async () => {
    setIsSavingConfig(true)
    try {
      const body: Record<string, any> = {
        mode,
        public_key: mode === "direct" ? publicKey.trim() : null,
      }

      if (mode === "direct") {
        if (secretKey.trim()) body.secret_key = secretKey.trim()
        else if (clearSecretKey) body.secret_key = null

        if (webhookSecret.trim()) body.webhook_secret = webhookSecret.trim()
        else if (clearWebhookSecret) body.webhook_secret = null
      } else {
        // keep stored direct credentials when switching back to platform
      }

      const res = await fetch("/admin/payment/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        toast.error(await readErrorMessage(res, "Failed to save payment configuration"))
        return
      }

      const data = (await res.json()) as PaymentConfig
      setPaymentConfig(data)
      setMode(data.mode)
      setPublicKey(data.direct?.public_key || "")
      setSecretKey("")
      setWebhookSecret("")
      setClearSecretKey(false)
      setClearWebhookSecret(false)
      toast.success("Payment configuration saved")
    } catch {
      toast.error("Failed to save payment configuration")
    } finally {
      setIsSavingConfig(false)
    }
  }

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handler)
  }, [search])

  // Load Transactions
  const fetchTransactions = async () => {
    setIsLoadingTx(true)
    setTxError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      })
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/admin/payment/transactions?${params.toString()}`, {
        credentials: "same-origin",
      })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.data || [])
        setTotalCount(data.total || 0)
        setSummary(data.summary || { total_count: 0, total_amount_success: 0, total_fees: 0 })
      } else {
        const message = await readErrorMessage(res, "Failed to load transactions")
        setTxError(message)
        setTransactions([])
      }
    } catch {
      setTxError("Failed to load transactions")
    } finally {
      setIsLoadingTx(false)
    }
  }

  useEffect(() => {
    if (activeTab === "transactions") {
      void fetchTransactions()
    }
  }, [activeTab, page, debouncedSearch, statusFilter])

  // Load Settlement & Banks
  const fetchSettlementData = async () => {
    setIsLoadingBanks(true)
    try {
      const [banksRes, stlRes] = await Promise.all([
        fetch("/admin/payment/banks", { credentials: "same-origin" }),
        fetch("/admin/payment/settlement", { credentials: "same-origin" }),
      ])

      if (banksRes.ok) {
        const banksData = await banksRes.json()
        setBanks(banksData.data || [])
        setTestMode(Boolean(banksData.test_mode))
      } else {
        toast.error(await readErrorMessage(banksRes, "Failed to load banks from Paystack"))
      }

      if (stlRes.ok) {
        const stlData = await stlRes.json()
        if (stlData?.bank_code) {
          setSettlement(stlData)
          setHasSettlement(true)
        } else {
          setHasSettlement(false)
        }
      } else if (stlRes.status === 404 || stlRes.status === 409) {
        setHasSettlement(false)
      } else {
        toast.error(await readErrorMessage(stlRes, "Failed to load settlement details"))
      }
    } catch {
      toast.error("Failed to load settlement details")
    } finally {
      setIsLoadingBanks(false)
    }
  }

  useEffect(() => {
  if (activeTab === "settlement") {
      void fetchSettlementData()
      void fetchManualAccount()
    }
  }, [activeTab])



  useEffect(() => {
    setResolveError("")
    if (accountNumber.length === 10 && selectedBankCode) {
      void handleResolve(selectedBankCode, accountNumber)
    } else {
      resolveRequestId.current += 1
      setResolvedAccountName("")
      setIsResolving(false)
    }
  }, [accountNumber, selectedBankCode])

  const handleResolve = async (bankCode: string, accNum: string) => {
    const requestId = ++resolveRequestId.current
    setIsResolving(true)
    try {
      const res = await fetch("/admin/payment/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bank_code: bankCode, account_number: accNum }),
      })

      if (requestId !== resolveRequestId.current) return

      if (res.ok) {
        const data = await res.json()
        setResolvedAccountName(data.account_name)
        setResolveError("")
        toast.success(`Account verified: ${data.account_name}`)
      } else {
        const message = await readErrorMessage(res, "Could not verify account details with bank")
        setResolvedAccountName("")
        setResolveError(
          message.includes("Test mode daily limit")
            ? "Paystack test mode has hit its daily limit for live bank lookups. The holder name will be confirmed when you save. Switch to a live key to see it before saving."
            : message
        )
      }
    } catch {
      if (requestId === resolveRequestId.current) {
        setResolvedAccountName("")
        setResolveError("Account verification failed")
      }
    } finally {
      if (requestId === resolveRequestId.current) {
        setIsResolving(false)
      }
    }
  }

  useEffect(() => {
    setManualResolveError("")
    if (manualAccountNumber.length === 10 && manualBankCode) {
      void handleManualResolve(manualBankCode, manualAccountNumber)
    } else {
      manualResolveRequestId.current += 1
      setManualResolvedAccountName("")
      setManualIsResolving(false)
    }
  }, [manualAccountNumber, manualBankCode])

  const handleManualResolve = async (bankCode: string, accNum: string) => {
    const requestId = ++manualResolveRequestId.current
    setManualIsResolving(true)
    try {
      const res = await fetch("/admin/payment/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bank_code: bankCode, account_number: accNum }),
      })

      if (requestId !== manualResolveRequestId.current) return

      if (res.ok) {
        const data = (await res.json()) as { account_name: string }
        setManualResolvedAccountName(data.account_name)
        setManualResolveError("")
      } else {
        setManualResolvedAccountName("")
        setManualResolveError(await readErrorMessage(res, "Could not verify account details with bank"))
      }
    } catch {
      if (requestId === manualResolveRequestId.current) {
        setManualResolvedAccountName("")
        setManualResolveError("Account verification failed")
      }
    } finally {
      if (requestId === manualResolveRequestId.current) {
        setManualIsResolving(false)
      }
    }
  }

  const handleSaveManualAccount = async () => {
    setManualIsSaving(true)
    try {
      const res = await fetch("/admin/payment/manual-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bank_code: manualBankCode,
          account_number: manualAccountNumber,
        }),
      })

      if (!res.ok) {
        toast.error(await readErrorMessage(res, "Failed to save manual settlement account"))
        return
      }

      const data = (await res.json()) as { account: ManualAccount }
      setManualAccount(data.account)
      setManualAccountNumber("")
      setManualResolvedAccountName("")
      setManualBankSearch("")
      toast.success("Manual settlement account saved")
    } catch {
      toast.error("Failed to save manual settlement account")
    } finally {
      setManualIsSaving(false)
    }
  }


  const handleSaveSettlement = async () => {
    setIsSavingSettlement(true)
    try {
      const res = await fetch("/admin/payment/settlement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bank_code: selectedBankCode,
          account_number: accountNumber,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSettlement(data)
        setHasSettlement(true)
        setShowConfirmModal(false)
        setAccountNumber("")
        setResolvedAccountName("")
        setBankSearch("")
        toast.success("Settlement account saved successfully!")
      } else {
        toast.error(await readErrorMessage(res, "Failed to save settlement account"))
      }
    } catch {
      toast.error("Failed to save settlement account")
    } finally {
      setIsSavingSettlement(false)
    }
  }

  const openTxDrawer = async (tx: Transaction) => {
    setSelectedTx(tx)
    setDrawerOpen(true)
    try {
      const res = await fetch(`/admin/payment/transactions/${encodeURIComponent(tx.reference)}`, {
        credentials: "same-origin",
      })
      if (res.ok) {
        const full = await res.json()
        setSelectedTx(full)
      }
    } catch {
      // keep existing row data
    }
  }

  const isDirectMode = (paymentConfig?.mode ?? mode) === "direct"


  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Heading level="h1">Payments & Settlement</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Configure how your store accepts Paystack payments, manage transactions, and set payout details.
          </Text>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
        <Text size="small" className="text-ui-fg-base">
          <span className="font-medium">Settlement timing:</span> payments received through the
          Paystack gateway or your own Paystack account can take up to 24 hours to settle. When you
          configure a manual account, customers pay that account directly and you reconcile each
          receipt on the order's detail page before making delivery.
        </Text>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="configuration">Configuration</Tabs.Trigger>
          <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
          <Tabs.Trigger value="settlement">Settlement</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="configuration" style={{ marginTop: 20 }}>
          <Container style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <Heading level="h2">Paystack provider</Heading>
                <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 4 }}>
                  Start on the Flowcheq platform Paystack gateway, or switch to your own Paystack account later.
                  Changes apply without redeploying your store.
                </Text>
              </div>
              <Button variant="secondary" onClick={() => void fetchPaymentConfig()} disabled={isLoadingConfig}>
                <ArrowPath className={isLoadingConfig ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>

            <div style={{ display: "grid", gap: 20, marginTop: 20, maxWidth: 760 }}>
              <div style={{ maxWidth: 360 }}>
                <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 6, display: "block" }}>
                  Payment mode
                </Text>
                <Select value={mode} onValueChange={(v) => setMode(v as "platform" | "direct")}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select mode" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="platform">Platform gateway (default)</Select.Item>
                    <Select.Item value="direct">My own Paystack account</Select.Item>
                  </Select.Content>
                </Select>
                <Text size="xsmall" className="text-ui-fg-subtle" style={{ marginTop: 6, display: "block" }}>
                  Platform gateway routes payments through Flowcheq and settles to your configured payout account.
                  Direct mode uses your own Paystack keys and dashboard.
                </Text>
              </div>

              {mode === "platform" && (
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" weight="plus">Platform gateway status</Text>
                  <Text size="small" className="text-ui-fg-subtle mt-1 block">
                    {paymentConfig?.platform.gateway_configured
                      ? "Gateway credentials are configured for this store. Transactions and settlement are managed in the tabs above."
                      : "Gateway credentials are not configured for this store yet. Provisioning or environment setup is required before platform payments can work."}
                  </Text>
                </div>
              )}

              {mode === "direct" && (
                <div className="grid gap-4">
                  <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                    <Text size="small" weight="plus">Use your own Paystack account</Text>
                    <Text size="small" className="text-ui-fg-subtle mt-1 block">
                      Enter your Paystack API keys below and add the webhook URL in your Paystack dashboard. Leave
                      secret fields blank to keep existing saved values.
                    </Text>
                  </div>

                  <div>
                    <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 6, display: "block" }}>
                      Paystack public key
                    </Text>
                    <Input
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="pk_test_... or pk_live_..."
                    />
                  </div>

                  <div>
                    <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 6, display: "block" }}>
                      Paystack secret key {paymentConfig?.direct.secret_key_set ? "(saved)" : ""}
                    </Text>
                    <Input
                      type="password"
                      value={secretKey}
                      onChange={(e) => {
                        setSecretKey(e.target.value)
                        if (e.target.value) setClearSecretKey(false)
                      }}
                      placeholder={paymentConfig?.direct.secret_key_set ? "Leave blank to keep current secret key" : "sk_test_... or sk_live_..."}
                    />
                    {paymentConfig?.direct.secret_key_set && (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={clearSecretKey}
                          onChange={(e) => {
                            setClearSecretKey(e.target.checked)
                            if (e.target.checked) setSecretKey("")
                          }}
                        />
                        Clear saved secret key
                      </label>
                    )}
                  </div>

                  <div>
                    <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 6, display: "block" }}>
                      Paystack webhook secret (optional) {paymentConfig?.direct.webhook_secret_set ? "(saved)" : ""}
                    </Text>
                    <Input
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => {
                        setWebhookSecret(e.target.value)
                        if (e.target.value) setClearWebhookSecret(false)
                      }}
                      placeholder={paymentConfig?.direct.webhook_secret_set ? "Leave blank to keep current value" : "Optional override; Paystack signs webhooks with your secret key by default"}
                    />
                    {paymentConfig?.direct.webhook_secret_set && (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={clearWebhookSecret}
                          onChange={(e) => {
                            setClearWebhookSecret(e.target.checked)
                            if (e.target.checked) setWebhookSecret("")
                          }}
                        />
                        Clear saved webhook secret
                      </label>
                    )}
                  </div>

                  {paymentConfig?.links && (
                    <div className="grid gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                      <Heading level="h3">Paystack dashboard links</Heading>
                      <Text size="small" className="text-ui-fg-subtle">
                        Copy these values into your Paystack dashboard. The webhook URL must receive Paystack events for this store.
                      </Text>
                      <CopyField label="Webhook URL" value={paymentConfig.links.webhook_url} />
                      <CopyField label="Callback URL" value={paymentConfig.links.callback_url} />
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Provider ID</Text>
                        <Text size="small" className="mt-1 block font-mono">
                          {paymentConfig.links.provider_id}
                        </Text>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === "platform" && paymentConfig?.links && (
                <div className="grid gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Heading level="h3">Integration details</Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    These are the configured links for this store. In platform mode, Flowcheq manages the Paystack webhook and routing.
                  </Text>
                  <CopyField label="Webhook URL" value={paymentConfig.links.webhook_url} />
                  <CopyField label="Callback URL" value={paymentConfig.links.callback_url} />
                </div>
              )}

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Button onClick={() => void handleSaveConfig()} disabled={isSavingConfig || isLoadingConfig}>
                  {isSavingConfig ? "Saving..." : "Save payment configuration"}
                </Button>
                {paymentConfig?.direct.ready && (
                  <Badge color={paymentConfig.mode === "direct" ? "green" : "grey"}>
                    Direct Paystack credentials saved
                  </Badge>
                )}
              </div>
            </div>
          </Container>
        </Tabs.Content>

        {/* TRANSACTIONS TAB */}
        <Tabs.Content value="transactions" style={{ marginTop: 20 }}>
          {isDirectMode && (
            <div className="mb-5 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
              <Text size="small" className="text-ui-fg-base">
                <span className="font-medium">Direct Paystack mode:</span> transaction history in this tab is available when the platform gateway is used.
                {" "}View and reconcile direct payments in your Paystack dashboard.
              </Text>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <Container style={{ padding: 16 }}>
              <Text size="small" className="text-ui-fg-subtle">Successful Volume</Text>
              <Heading level="h2" style={{ marginTop: 4 }}>
                {formatMoney(summary.total_amount_success)}
              </Heading>
            </Container>
            <Container style={{ padding: 16 }}>
              <Text size="small" className="text-ui-fg-subtle">Paid Transactions</Text>
              <Heading level="h2" style={{ marginTop: 4 }}>
                {summary.total_count}
              </Heading>
            </Container>
            <Container style={{ padding: 16 }}>
              <Text size="small" className="text-ui-fg-subtle">Paystack Fees Borne</Text>
              <Heading level="h2" style={{ marginTop: 4 }}>
                {formatMoney(summary.total_fees)}
              </Heading>
            </Container>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
            <div style={{ position: "relative", width: 280 }}>
              <Input
                placeholder="Search reference or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ width: 160 }}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger>
                  <Select.Value placeholder="Filter status" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Statuses</Select.Item>
                  <Select.Item value="success">Success</Select.Item>
                  <Select.Item value="pending">Pending</Select.Item>
                  <Select.Item value="failed">Failed</Select.Item>
                  <Select.Item value="refunded">Refunded</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <Button variant="secondary" onClick={() => void fetchTransactions()} disabled={isLoadingTx}>
              <ArrowPath className={isLoadingTx ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>

          {txError && (
            <div className="mb-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
              <Text size="small" className="text-ui-fg-error">{txError}</Text>
            </div>
          )}

          <Container style={{ padding: 0, overflow: "hidden" }}>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Date</Table.HeaderCell>
                  <Table.HeaderCell>Reference</Table.HeaderCell>
                  <Table.HeaderCell>Customer Email</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>Fees</Table.HeaderCell>
                  <Table.HeaderCell>Net</Table.HeaderCell>
                  <Table.HeaderCell>Channel</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {transactions.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                      <Text className="text-ui-fg-subtle">
                        {isLoadingTx ? "Loading transactions..." : "No transactions found."}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  transactions.map((tx) => (
                    <Table.Row key={tx.reference} style={{ cursor: "pointer" }} onClick={() => void openTxDrawer(tx)}>
                      <Table.Cell>{formatDate(tx.created_at)}</Table.Cell>
                      <Table.Cell style={{ fontFamily: "monospace" }}>{tx.reference}</Table.Cell>
                      <Table.Cell>{tx.customer_email}</Table.Cell>
                      <Table.Cell>{formatMoney(tx.amount, tx.currency)}</Table.Cell>
                      <Table.Cell className="text-ui-fg-subtle">
                        {tx.fees !== null ? formatMoney(tx.fees, tx.currency) : "-"}
                      </Table.Cell>
                      <Table.Cell style={{ fontWeight: 500 }}>
                        {formatMoney(tx.amount - (tx.fees || 0), tx.currency)}
                      </Table.Cell>
                      <Table.Cell>{tx.channel || "-"}</Table.Cell>
                      <Table.Cell>
                        <StatusBadge color={statusColor(tx.status)}>{tx.status}</StatusBadge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </Container>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <Text size="small" className="text-ui-fg-subtle">
              Total {totalCount} transactions
            </Text>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="small" disabled={page * perPage >= totalCount} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Tabs.Content>

        {/* SETTLEMENT TAB */}
        <Tabs.Content value="settlement" style={{ marginTop: 20 }}>
          {isDirectMode ? (
            <Container style={{ padding: 24 }}>
              <Heading level="h2">Settlement</Heading>
              <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 8 }}>
                In direct Paystack mode, payouts and settlement accounts are managed in your own Paystack dashboard.
                Switch to the platform gateway if you want Flowcheq to manage settlement routing for this store.
              </Text>
            </Container>
          ) : (
            <>
              {!hasSettlement && (
                <div className="mb-5 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" className="text-ui-fg-base">
                    <span className="font-medium">Action required:</span> Payments are disabled until you add a settlement bank account.
                  </Text>
                </div>
              )}

              {settlement && (
                <Container style={{ padding: 24, marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <Text size="small" className="text-ui-fg-subtle">Active Settlement Account</Text>
                      <Heading level="h2" style={{ marginTop: 4 }}>{settlement.bank_name}</Heading>
                      <Text style={{ marginTop: 4, fontWeight: 500 }}>{settlement.account_name}</Text>
                      <Text className="text-ui-fg-subtle" style={{ fontFamily: "monospace", marginTop: 4 }}>
                        •••• {settlement.account_number_last4}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 8 }}>
                        Verified on {formatDate(settlement.verified_at)}
                      </Text>
                    </div>
                    <Badge color="green">Active</Badge>
                  </div>
                </Container>
              )}

              <Container style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div>
                    <Heading level="h2" style={{ marginBottom: 8 }}>
                      {settlement ? "Change Settlement Account" : "Add Settlement Bank Account"}
                    </Heading>
                    <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 20 }}>
                      All customer payments will settle directly to this account via the platform gateway.
                    </Text>
                  </div>
                  <Button variant="secondary" size="small" onClick={() => void fetchSettlementData()} disabled={isLoadingBanks}>
                    <ArrowPath className={isLoadingBanks ? "animate-spin" : ""} />
                    Refresh banks
                  </Button>
                </div>

                <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Bank</label>
                    <Input
                      placeholder="Search banks..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    <Select value={selectedBankCode} onValueChange={(val) => {
                      setSelectedBankCode(val)
                      setResolvedAccountName("")
                      setBankSearch("")
                    }}>
                      <Select.Trigger>
                        <Select.Value placeholder={isLoadingBanks ? "Loading banks..." : "Select bank"} />
                      </Select.Trigger>
                      <Select.Content>
                        {bankOptions.map((b) => (
                          <Select.Item key={b.code} value={b.code}>{b.name}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>10-Digit Account Number</label>
                    <Input
                      maxLength={10}
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  {testMode === true && (
                    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                      <Text size="small" className="text-ui-fg-subtle">
                        Paystack test mode limits live account lookups. If the holder name does not appear automatically, Paystack confirms it when you save.
                      </Text>
                    </div>
                  )}

                  {isResolving && <Text size="small" className="text-ui-fg-subtle">Verifying account with bank...</Text>}

                  {resolveError && (
                    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                      <Text size="small" className="text-ui-fg-error">{resolveError}</Text>
                    </div>
                  )}

                  {resolvedAccountName && (
                    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                      <Text size="small" className="text-ui-fg-subtle">Account Holder Name</Text>
                      <Text size="small" weight="plus" className="text-ui-fg-base">{resolvedAccountName}</Text>
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <Button
                      disabled={(!resolvedAccountName && testMode !== true) || isResolving || isSavingSettlement}
                      onClick={() => {
                        if (settlement) setShowConfirmModal(true)
                        else void handleSaveSettlement()
                      }}
                    >
                      {isSavingSettlement ? "Saving..." : "Confirm & Save Settlement Account"}
                    </Button>
                  </div>
                </div>
              </Container>

              {showConfirmModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-ui-bg-overlay/80">
                  <div className="max-w-[440px] rounded-xl border border-ui-border-base bg-ui-bg-base p-6 shadow-elevation-flyout">
                    <Heading level="h2">Change Settlement Destination?</Heading>
                    <Text size="small" className="text-ui-fg-subtle mt-3">
                      Warning: Changing your bank account will redirect all future payouts to{" "}
                      <span className="font-medium text-ui-fg-base">
                        {resolvedAccountName || `the account ending in ${accountNumber.slice(-4)}`}
                      </span>. Are you sure you want to proceed?
                    </Text>
                    <div className="mt-6 flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                      <Button variant="danger" onClick={() => void handleSaveSettlement()} disabled={isSavingSettlement}>Confirm & Update</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

  <div style={{ marginTop: 32 }}>
    <Heading level="h2">Manual payment account</Heading>
    <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 16 }}>
      Customers who choose manual settlement transfer funds directly to this account.
      Reconcile each receipt on the order detail page.
    </Text>
            {manualAccount && (
              <Container style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Active Manual Account</Text>
                    <Heading level="h2" style={{ marginTop: 4 }}>{manualAccount.bank_name}</Heading>
                    <Text style={{ marginTop: 4, fontWeight: 500 }}>{manualAccount.account_name}</Text>
                    <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 8 }}>
                      Verified on {formatDate(manualAccount.verified_at)}
                    </Text>
                  </div>
                  <Badge color="green">Direct payments</Badge>
                </div>
                <div style={{ maxWidth: 360, marginTop: 16 }}>
                  <CopyField label="Account number" value={manualAccount.account_number} />
                </div>
              </Container>
            )}

            <Container style={{ padding: 24 }}>
  <Heading level="h2" style={{ marginBottom: 8 }}>
    {isLoadingManual ? "Loading manual account..." : manualAccount ? "Change Manual Account" : "Add Manual Settlement Account"}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 20 }}>
                Verify a personal bank account with Paystack and show it to customers at checkout.
                This account is separate from Paystack payout settlement.
              </Text>

              <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Bank</label>
                  <Input
                    placeholder="Search banks..."
                    value={manualBankSearch}
                    onChange={(e) => setManualBankSearch(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <Select value={manualBankCode} onValueChange={(val) => {
                    setManualBankCode(val)
                    setManualResolvedAccountName("")
                    setManualBankSearch("")
                  }}>
                    <Select.Trigger>
                      <Select.Value placeholder={isLoadingBanks ? "Loading banks..." : "Select bank"} />
                    </Select.Trigger>
                    <Select.Content>
                      {manualBankOptions.map((b) => (
                        <Select.Item key={b.code} value={b.code}>{b.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>10-Digit Account Number</label>
                  <Input
                    maxLength={10}
                    placeholder="0123456789"
                    value={manualAccountNumber}
                    onChange={(e) => setManualAccountNumber(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {manualIsResolving && <Text size="small" className="text-ui-fg-subtle">Verifying account with bank...</Text>}

                {manualResolveError && (
                  <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                    <Text size="small" className="text-ui-fg-error">{manualResolveError}</Text>
                  </div>
                )}

                {manualResolvedAccountName && (
                  <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                    <Text size="small" className="text-ui-fg-subtle">Account Holder Name</Text>
                    <Text size="small" weight="plus" className="text-ui-fg-base">{manualResolvedAccountName}</Text>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <Button
                    disabled={!manualResolvedAccountName || manualIsResolving || manualIsSaving}
                    onClick={() => void handleSaveManualAccount()}
                  >
                    {manualIsSaving ? "Saving..." : "Verify & Save Manual Account"}
                  </Button>
                </div>
              </div>
            </Container>

  </div>
        </Tabs.Content>

      </Tabs>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Transaction Details</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body style={{ display: "grid", gap: 16 }}>
            {selectedTx && (
              <>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Reference</Text>
                  <Text style={{ fontFamily: "monospace", fontWeight: 500 }}>{selectedTx.reference}</Text>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Status</Text>
                  <StatusBadge color={statusColor(selectedTx.status)}>{selectedTx.status}</StatusBadge>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Customer</Text>
                  <Text>{selectedTx.customer_email}</Text>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Amount Collected</Text>
                  <Heading level="h3">{formatMoney(selectedTx.amount, selectedTx.currency)}</Heading>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Paystack Processing Fee</Text>
                  <Text>{selectedTx.fees !== null ? formatMoney(selectedTx.fees, selectedTx.currency) : "N/A"}</Text>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Net Settlement Amount</Text>
                  <Text style={{ fontWeight: 600 }}>{formatMoney(selectedTx.amount - (selectedTx.fees || 0), selectedTx.currency)}</Text>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Channel</Text>
                  <Text>{selectedTx.channel || "card"}</Text>
                </div>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Paid Date</Text>
                  <Text>{formatDate(selectedTx.paid_at)}</Text>
                </div>
              </>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Payments",
  icon: CreditCard,
  rank: 110,
})

export default PaymentsPage
