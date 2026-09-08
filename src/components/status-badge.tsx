import { cn } from "@/lib/utils";

const styles = { PAID: "bg-emerald-50 text-emerald-700", PARTIAL: "bg-amber-50 text-amber-800", UNPAID: "bg-slate-100 text-slate-700", VOID: "bg-rose-100 text-rose-800", FINALIZED: "bg-blue-50 text-blue-700" };

export function StatusBadge({ status }: { status: keyof typeof styles }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black tracking-wide", styles[status])}>{status}</span>;
}
