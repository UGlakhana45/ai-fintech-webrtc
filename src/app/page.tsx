"use client";

import { DashboardMetrics } from "@/features/FintechDashboard/DashboardMetrics";
import { TransactionTable } from "@/features/FintechDashboard/TransactionTable";
import { useFintechData } from "@/features/FintechDashboard/useFintechData.hook";
import { LiveAdvisorVideo } from "@/features/LiveAdvisor/LiveAdvisorVideo";

export default function Home() {
  const { balances, transactions, summary } = useFintechData();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200/80 bg-white/90 px-6 py-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            AI Fintech
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Operations dashboard
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Financial metrics and activity are mocked and isolated from the live
            advisor WebRTC module.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-6 py-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
          <div className="flex flex-col gap-8 xl:col-span-7 2xl:col-span-8">
            <DashboardMetrics summary={summary} balances={balances} />
            <TransactionTable transactions={transactions} />
          </div>
          <div className="xl:col-span-5 2xl:col-span-4 xl:sticky xl:top-8">
            <LiveAdvisorVideo />
          </div>
        </div>
      </main>
    </div>
  );
}
