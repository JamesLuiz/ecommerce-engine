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

const PaymentsPage = () => {
  const [activeTab, setActiveTab] = useState("transactions")

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
  const [isResolving, setIsResolving] = useState(false)
  const [isSavingSettlement, setIsSavingSettlement] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [testMode, setTestMode] = useState<boolean | null>(null)
  const resolveRequestId = useRef(0)

  const bankOptions = useMemo(() => {
    const unique = Array.from(
      new Map(banks.map((bank): [string, Bank] => [bank.code, bank])).values(),
    )
    const query = bankSearch.trim().toLowerCase()

    if (!query) {
      return unique
    }

    return unique.filter(
      (bank) =>
        bank.name.toLowerCase().includes(query) || bank.code.toLowerCase().includes(query),
    )
  }, [banks, bankSearch])

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handler)
  }, [search])

  // Load Transactions
  const fetchTransactions = async () => {
    setIsLoadingTx(true)
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
      }
    } catch {
      toast.error("Failed to load transactions")
    } finally {
      setIsLoadingTx(false)
    }
  }

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions()
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
      fetchSettlementData()
    }
  }, [activeTab])

  // Auto-resolve account number at 10 digits. Paystack test mode rate-limits
  // /bank/resolve, so the account name is confirmed by the subaccount call on save.
  useEffect(() => {
    if (testMode !== false) {
      setResolvedAccountName("")
      return
    }

    if (accountNumber.length === 10 && selectedBankCode) {
      handleResolve(selectedBankCode, accountNumber)
    } else {
      setResolvedAccountName("")
    }
  }, [accountNumber, selectedBankCode, testMode])

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

      if (requestId !== resolveRequestId.current) {
        return
      }

      if (res.ok) {
        const data = await res.json()
        setResolvedAccountName(data.account_name)
        toast.success(`Account verified: ${data.account_name}`)
      } else {
        setResolvedAccountName("")
        toast.error(await readErrorMessage(res, "Could not verify account details with bank"))
      }
    } catch {
      if (requestId === resolveRequestId.current) {
        setResolvedAccountName("")
        toast.error("Account verification failed")
      }
    } finally {
      if (requestId === resolveRequestId.current) {
        setIsResolving(false)
      }
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

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Heading level="h1">Payments & Settlement</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage transactions and configure your payout settlement bank account.
          </Text>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
          <Tabs.Trigger value="settlement">Settlement</Tabs.Trigger>
        </Tabs.List>

        {/* TRANSACTIONS TAB */}
        <Tabs.Content value="transactions" style={{ marginTop: 20 }}>
          {/* Summary Strip */}
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

          {/* Filter Bar */}
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
            <Button variant="secondary" onClick={() => fetchTransactions()} disabled={isLoadingTx}>
              <ArrowPath className={isLoadingTx ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>

          {/* Transactions Table */}
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
                    <Table.Row
                      key={tx.reference}
                      style={{ cursor: "pointer" }}
                      onClick={() => openTxDrawer(tx)}
                    >
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
                        <StatusBadge color={statusColor(tx.status)}>
                          {tx.status}
                        </StatusBadge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </Container>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <Text size="small" className="text-ui-fg-subtle">
              Total {totalCount} transactions
            </Text>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="secondary"
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={page * perPage >= totalCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Tabs.Content>

        {/* SETTLEMENT TAB */}
        <Tabs.Content value="settlement" style={{ marginTop: 20 }}>
          {!hasSettlement && (
            <div style={{
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              color: "#92400E",
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
            }}>
              <strong>Action required:</strong> Payments are disabled until you add a settlement bank account.
            </div>
          )}

          {/* Current Settlement Card */}
          {settlement && (
            <Container style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Active Settlement Account</Text>
                  <Heading level="h2" style={{ marginTop: 4 }}>
                    {settlement.bank_name}
                  </Heading>
                  <Text style={{ marginTop: 4, fontWeight: 500 }}>
                    {settlement.account_name}
                  </Text>
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

          {/* Update Settlement Form */}
          <Container style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <Heading level="h2" style={{ marginBottom: 8 }}>
                  {settlement ? "Change Settlement Account" : "Add Settlement Bank Account"}
                </Heading>
                <Text size="small" className="text-ui-fg-subtle" style={{ marginBottom: 20 }}>
                  All customer payments will settle directly to this account via Paystack.
                </Text>
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() => fetchSettlementData()}
                disabled={isLoadingBanks}
              >
                <ArrowPath className={isLoadingBanks ? "animate-spin" : ""} />
                Refresh banks
              </Button>
            </div>

            <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                  Bank
                </label>
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
                      <Select.Item key={b.code} value={b.code}>
                        {b.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {!isLoadingBanks && banks.length === 0 && (
                  <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 6 }}>
                    Could not load banks from Paystack. Use Refresh banks to try again.
                  </Text>
                )}
                {!isLoadingBanks && banks.length > 0 && bankOptions.length === 0 && (
                  <Text size="small" className="text-ui-fg-subtle" style={{ marginTop: 6 }}>
                    No bank matches "{bankSearch}".
                  </Text>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                  10-Digit Account Number
                </label>
                <Input
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "")
                    setAccountNumber(digits)
                  }}
                />
              </div>

              {testMode === true && (
                <div style={{
                  padding: "12px 16px",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 6,
                }}>
                  <Text size="small" className="text-ui-fg-subtle">
                    Paystack test mode: account resolution is rate-limited, so Paystack
                    validates the account and returns the holder name when you save.
                  </Text>
                </div>
              )}

              {isResolving && (
                <Text size="small" className="text-ui-fg-subtle">
                  Verifying account with bank...
                </Text>
              )}

              {resolvedAccountName && (
                <div style={{
                  padding: "12px 16px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 6,
                }}>
                  <Text size="small" className="text-ui-fg-subtle">Account Holder Name</Text>
                  <Text style={{ fontWeight: 600, color: "#166534" }}>{resolvedAccountName}</Text>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <Button
                  disabled={
                    (!resolvedAccountName && testMode !== true) ||
                    isResolving ||
                    isSavingSettlement
                  }
                  onClick={() => {
                    if (settlement) {
                      setShowConfirmModal(true)
                    } else {
                      handleSaveSettlement()
                    }
                  }}
                >
                  {isSavingSettlement ? "Saving..." : "Confirm & Save Settlement Account"}
                </Button>
              </div>
            </div>
          </Container>

          {/* Confirm Dialog for Changing Account */}
          {showConfirmModal && (
            <div style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
            }}>
              <div style={{ background: "white", padding: 24, borderRadius: 12, maxWidth: 440 }}>
                <Heading level="h2">Change Settlement Destination?</Heading>
                <Text style={{ marginTop: 12 }} className="text-ui-fg-subtle">
                  Warning: Changing your bank account will redirect all future payouts to{" "}
                  <strong>
                    {resolvedAccountName || `the account ending in ${accountNumber.slice(-4)}`}
                  </strong>
                  . Are you sure you want to proceed?
                </Text>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
                  <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={() => handleSaveSettlement()} disabled={isSavingSettlement}>
                    Confirm & Update
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs>

      {/* Transaction Details Drawer */}
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
                  <StatusBadge color={statusColor(selectedTx.status)}>
                    {selectedTx.status}
                  </StatusBadge>
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
                  <Text style={{ fontWeight: 600 }}>
                    {formatMoney(selectedTx.amount - (selectedTx.fees || 0), selectedTx.currency)}
                  </Text>
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
