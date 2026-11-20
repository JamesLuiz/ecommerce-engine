/** Serializable shapes passed from settlement server pages to client tabs. */

export interface ReferralEarningView {
  id: string
  customerName: string | null
  customerEmail: string
  paymentReference: string
  amountMinor: number
  createdAt: string
  settled: boolean
}

export interface ReferralSettlementView {
  id: string
  amountMinor: number
  paymentReference: string | null
  notes: string | null
  settledBy: string
  createdAt: string
}

export interface ReferralSettlementRowView {
  enrollmentId: string
  name: string
  email: string
  bankName: string
  accountNumber: string
  joinedAt: string
  totalReferrals: number
  unsettledReferrals: number
  totalEarnedMinor: number
  unsettledMinor: number
  settledMinor: number
  earnings: ReferralEarningView[]
  settlements: ReferralSettlementView[]
}
