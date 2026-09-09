import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/auth";
import { ExpenseForm } from "../expense-form";

export default async function NewExpensePage() {
  await requirePermission("expenses:manage");
  return <div className="mx-auto max-w-2xl"><Button asChild variant="ghost" className="mb-5"><Link href="/expenses"><ArrowLeft className="size-5" />Expenses</Link></Button><PageHeading eyebrow="Expenses" title="Record expense" description="Create an immutable financial expense snapshot. Corrections use a controlled void." /><Card className="p-5 sm:p-7"><ExpenseForm /></Card></div>;
}
