"use client";

import { useMemo } from "react";
import type {
  AccountBalance,
  DashboardSummary,
  Transaction,
} from "./fintech.types";

const MOCK_BALANCES: AccountBalance[] = [
  {
    label: "Primary checking",
    currency: "USD",
    availableCents: 482_900,
    pendingCents: 12_000,
  },
  {
    label: "High-yield savings",
    currency: "USD",
    availableCents: 1_250_000,
    pendingCents: 0,
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "txn_001",
    occurredAt: "2025-03-22T14:20:00Z",
    description: "Salary deposit",
    amountCents: 6_500_00,
    category: "Income",
    status: "completed",
  },
  {
    id: "txn_002",
    occurredAt: "2025-03-21T09:05:00Z",
    description: "Whole Foods Market",
    amountCents: -127_45,
    category: "Groceries",
    status: "completed",
  },
  {
    id: "txn_003",
    occurredAt: "2025-03-20T18:40:00Z",
    description: "Uber trip",
    amountCents: -24_80,
    category: "Transport",
    status: "pending",
  },
  {
    id: "txn_004",
    occurredAt: "2025-03-19T11:12:00Z",
    description: "Rent payment",
    amountCents: -2_200_00,
    category: "Housing",
    status: "completed",
  },
  {
    id: "txn_005",
    occurredAt: "2025-03-18T08:55:00Z",
    description: "Dividend reinvestment",
    amountCents: 58_20,
    category: "Investments",
    status: "completed",
  },
];

function buildSummary(
  balances: AccountBalance[],
  transactions: Transaction[],
): DashboardSummary {
  const totalBalanceCents = balances.reduce(
    (sum, b) => sum + b.availableCents + b.pendingCents,
    0,
  );
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.occurredAt);
    return d.getUTCMonth() === month && d.getUTCFullYear() === year;
  });
  const monthSpendCents = monthTx
    .filter((t) => t.amountCents < 0)
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  const monthIncomeCents = monthTx
    .filter((t) => t.amountCents > 0)
    .reduce((sum, t) => sum + t.amountCents, 0);
  const savingsRatePercent =
    monthIncomeCents > 0
      ? Math.round(
          ((monthIncomeCents - monthSpendCents) / monthIncomeCents) * 100,
        )
      : 0;

  return {
    totalBalanceCents,
    monthSpendCents,
    monthIncomeCents,
    savingsRatePercent,
  };
}

export interface UseFintechDataResult {
  balances: AccountBalance[];
  transactions: Transaction[];
  summary: DashboardSummary;
}

export function useFintechData(): UseFintechDataResult {
  const balances = MOCK_BALANCES;
  const transactions = MOCK_TRANSACTIONS;

  const summary = useMemo(
    () => buildSummary(balances, transactions),
    [balances, transactions],
  );

  return {
    balances,
    transactions,
    summary,
  };
}
