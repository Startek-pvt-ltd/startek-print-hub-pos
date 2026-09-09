import Link from "next/link";
import { Plus } from "lucide-react";
import type { ExpenseCategory, PaymentMethod, Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { expenseCategoryLabels, formatShopDateTime, paymentMethodLabels } from "@/domain/phase5";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const categories = Object.keys(expenseCategoryLabels) as ExpenseCategory[];
const methods = Object.keys(paymentMethodLabels) as PaymentMethod[];

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("expenses:manage");
  const raw = await searchParams; const value = (key: string) => typeof raw[key] === "string" ? raw[key] : ""; const search = value("search").trim();
  const category = categories.includes(value("category") as ExpenseCategory) ? value("category") as ExpenseCategory : undefined;
  const method = methods.includes(value("method") as PaymentMethod) ? value("method") as PaymentMethod : undefined;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(value("from")) ? new Date(`${value("from")}T00:00:00+05:30`) : undefined;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(value("to")) ? new Date(`${value("to")}T23:59:59.999+05:30`) : undefined;
  const where: Prisma.ExpenseWhereInput = { category, paymentMethod: method, expenseDate: from || to ? { gte: from, lte: to } : undefined, OR: search ? [{ expenseNumber: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] : undefined };
  const expenses = await db.expense.findMany({ where, include: { createdBy: { select: { name: true } } }, orderBy: { expenseDate: "desc" }, take: 200 });
  return <><PageHeading eyebrow="Finance" title="Expenses" description="Search and review immutable business expense records." action={<Button asChild><Link href="/expenses/new"><Plus className="size-5" />New expense</Link></Button>} /><Card className="mb-5 p-4"><form className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"><Input name="search" defaultValue={search} placeholder="Expense number or description" aria-label="Expense number or description" /><select name="category" defaultValue={category ?? ""} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{expenseCategoryLabels[item]}</option>)}</select><select name="method" defaultValue={method ?? ""} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3"><option value="">All methods</option>{methods.map((item) => <option key={item} value={item}>{paymentMethodLabels[item]}</option>)}</select><Input type="date" name="from" defaultValue={value("from")} aria-label="From date" /><Input type="date" name="to" defaultValue={value("to")} aria-label="To date" /><Button variant="secondary">Filter</Button></form></Card><Card className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-4">Expense</th><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Method</th><th className="p-4">Entered by</th><th className="p-4 text-right">Amount</th><th className="p-4">Status</th></tr></thead><tbody>{expenses.map((expense) => <tr className="border-t" key={expense.id}><td className="p-4 font-black text-blue-700"><Link href={`/expenses/${expense.id}`}>{expense.expenseNumber}</Link></td><td className="p-4">{formatShopDateTime(expense.expenseDate)}</td><td className="p-4">{expenseCategoryLabels[expense.category]}</td><td className="max-w-xs truncate p-4">{expense.description}</td><td className="p-4">{paymentMethodLabels[expense.paymentMethod]}</td><td className="p-4">{expense.createdBy.name}</td><td className="p-4 text-right font-black">Rs. {expense.amount.toFixed(2)}</td><td className="p-4"><StatusBadge status={expense.status} /></td></tr>)}</tbody></table>{expenses.length === 0 ? <p className="p-10 text-center text-slate-500">No expenses match these filters.</p> : null}</Card></>;
}
