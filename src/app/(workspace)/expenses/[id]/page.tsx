import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { expenseCategoryLabels, formatShopDateTime, paymentMethodLabels } from "@/domain/phase5";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { VoidExpenseButton } from "./void-expense-button";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses:manage"); const { id } = await params;
  const expense = await db.expense.findUnique({ where: { id }, include: { createdBy: { select: { name: true } }, voidedBy: { select: { name: true } }, cashSession: { select: { id: true, status: true } } } }); if (!expense) notFound();
  return <div className="mx-auto max-w-4xl"><Button asChild variant="ghost" className="mb-5"><Link href="/expenses"><ArrowLeft className="size-5" />Expenses</Link></Button><PageHeading eyebrow="Expense detail" title={expense.expenseNumber} description={`${expenseCategoryLabels[expense.category]} · ${paymentMethodLabels[expense.paymentMethod]}`} action={<StatusBadge status={expense.status} />} /><div className="grid gap-5 md:grid-cols-2"><Card className="p-6"><dl className="grid gap-5"><Detail label="Description" value={expense.description} /><Detail label="Amount" value={`Rs. ${expense.amount.toFixed(2)}`} /><Detail label="Date and time" value={formatShopDateTime(expense.expenseDate)} /><Detail label="Entered by" value={expense.createdBy.name} />{expense.cashSession ? <Detail label="Cash session" value={<Link className="font-bold text-blue-700" href={`/cash-register/${expense.cashSession.id}`}>View session · {expense.cashSession.status}</Link>} /> : null}</dl></Card><Card className="p-6">{expense.status === "VOID" ? <div className="space-y-4"><h2 className="font-black text-rose-800">Void context</h2><Detail label="Reason" value={expense.voidReason ?? "—"} /><Detail label="Voided by" value={expense.voidedBy?.name ?? "—"} /><Detail label="Voided at" value={expense.voidedAt ? formatShopDateTime(expense.voidedAt) : "—"} /></div> : expense.cashSession?.status === "CLOSED" ? <p className="rounded-xl bg-slate-100 p-4 text-sm">This cash expense belongs to a closed register and is immutable.</p> : <VoidExpenseButton expenseId={expense.id} />}</Card></div></div>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg">{value}</dd></div>; }
