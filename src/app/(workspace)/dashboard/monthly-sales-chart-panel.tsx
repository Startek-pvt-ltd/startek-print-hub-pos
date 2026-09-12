"use client";

import dynamic from "next/dynamic";

const MonthlySalesChart = dynamic(
  () => import("./monthly-sales-chart").then((module) => module.MonthlySalesChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-slate-100" aria-label="Loading monthly sales chart" /> },
);

export function MonthlySalesChartPanel({ data }: { data: Array<{ month: string; sales: number }> }) {
  return <MonthlySalesChart data={data} />;
}
