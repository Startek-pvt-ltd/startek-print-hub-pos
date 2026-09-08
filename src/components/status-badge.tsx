import { cn } from "@/lib/utils";

const styles: Record<string, string> = { PAID: "bg-emerald-50 text-emerald-700", PARTIAL: "bg-amber-50 text-amber-800", UNPAID: "bg-slate-100 text-slate-700", VOID: "bg-rose-100 text-rose-800", FINALIZED: "bg-blue-50 text-blue-700", DRAFT: "bg-slate-100 text-slate-700", ISSUED: "bg-blue-50 text-blue-700", ACCEPTED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-100 text-rose-800", EXPIRED: "bg-amber-50 text-amber-800", CONVERTED: "bg-violet-50 text-violet-700", PENDING: "bg-slate-100 text-slate-700", DESIGNING: "bg-cyan-50 text-cyan-800", WAITING_APPROVAL: "bg-amber-50 text-amber-800", APPROVED: "bg-blue-50 text-blue-700", PRINTING: "bg-indigo-50 text-indigo-700", FINISHING: "bg-violet-50 text-violet-700", READY: "bg-emerald-50 text-emerald-700", DELIVERED: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-rose-100 text-rose-800" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black tracking-wide", styles[status] ?? "bg-slate-100 text-slate-700")}>{status.replaceAll("_", " ")}</span>;
}
