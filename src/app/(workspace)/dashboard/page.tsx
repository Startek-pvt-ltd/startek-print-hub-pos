import { Banknote, CalendarClock, CircleDollarSign, PackageCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";

const metrics = [
  { label: "Today's sales", value: "Rs. 0.00", note: "No finalized invoices", icon: TrendingUp, color: "text-blue-700 bg-blue-50" },
  { label: "Today's expenses", value: "Rs. 0.00", note: "No expenses recorded", icon: Banknote, color: "text-rose-700 bg-rose-50" },
  { label: "Pending orders", value: "0", note: "Production queue", icon: CalendarClock, color: "text-amber-700 bg-amber-50" },
  { label: "Outstanding", value: "Rs. 0.00", note: "Active invoice balances", icon: CircleDollarSign, color: "text-emerald-700 bg-emerald-50" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeading eyebrow="Overview" title="Dashboard" description="A quick view of today’s shop activity and production workload." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <Card key={metric.label} className="p-5"><div className={`grid size-12 place-items-center rounded-xl ${metric.color}`}><metric.icon className="size-6" /></div><p className="mt-5 text-sm font-bold text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-black text-slate-950">{metric.value}</p><p className="mt-2 text-xs text-slate-400">{metric.note}</p></Card>)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6"><h2 className="text-lg font-black text-slate-900">Recent transactions</h2><div className="mt-6 grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center"><div><PackageCheck className="mx-auto size-8 text-slate-400" /><p className="mt-3 font-bold text-slate-700">No transactions yet</p><p className="mt-1 text-sm text-slate-500">New invoices and payments will appear here.</p></div></div></Card>
        <Card className="p-6"><h2 className="text-lg font-black text-slate-900">Ready orders</h2><p className="mt-2 text-sm text-slate-500">Jobs waiting for customer collection.</p><div className="mt-8 text-center"><p className="text-5xl font-black text-blue-700">0</p><p className="mt-2 text-sm font-bold text-slate-500">No orders ready</p></div></Card>
      </div>
    </>
  );
}
