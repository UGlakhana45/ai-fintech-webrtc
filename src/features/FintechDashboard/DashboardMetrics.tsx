import type { AccountBalance, DashboardSummary } from "./fintech.types";
import { formatCurrencyCents } from "./fintech.utils";

export interface DashboardMetricsProps {
  summary: DashboardSummary;
  balances: AccountBalance[];
}

export function DashboardMetrics({ summary, balances }: DashboardMetricsProps) {
  const primaryCurrency = balances[0]?.currency ?? "USD";

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Overview
        </h2>
        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Portfolio snapshot
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total balance
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrencyCents(summary.totalBalanceCents, primaryCurrency)}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Month spend
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            {formatCurrencyCents(summary.monthSpendCents, primaryCurrency)}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Month income
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrencyCents(summary.monthIncomeCents, primaryCurrency)}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Savings rate
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {summary.savingsRatePercent}%
          </p>
        </article>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {balances.map((b) => (
          <article
            key={b.label}
            className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50 p-4 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900"
          >
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {b.label}
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatCurrencyCents(b.availableCents, b.currency)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Pending {formatCurrencyCents(b.pendingCents, b.currency)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
