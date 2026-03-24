import type { Transaction } from "./fintech.types";
import { formatShortDate, formatSignedUsd } from "./fintech.utils";

function statusStyles(status: Transaction["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "pending":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "failed":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300";
  }
}

export interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Activity
          </h2>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent transactions
          </p>
        </div>
      </header>
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-300">
                    {formatShortDate(t.occurredAt)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {t.description}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {t.category}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                      t.amountCents >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {formatSignedUsd(t.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
