export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  occurredAt: string;
  description: string;
  amountCents: number;
  category: string;
  status: TransactionStatus;
}

export interface AccountBalance {
  label: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
}

export interface DashboardSummary {
  totalBalanceCents: number;
  monthSpendCents: number;
  monthIncomeCents: number;
  savingsRatePercent: number;
}
