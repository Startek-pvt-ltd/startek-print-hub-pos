"use client";

import { useState, useTransition } from "react";
import { voidExpenseAction } from "@/app/(workspace)/phase5-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VoidExpenseButton({ expenseId }: { expenseId: string }) {
  const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  return <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-black text-rose-900">Controlled correction</p><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required void reason" /><Button variant="danger" disabled={pending || reason.trim().length < 3} onClick={() => { if (!confirm("Void this expense while retaining its complete history?")) return; startTransition(async () => { const result = await voidExpenseAction({ expenseId, reason }); setMessage(result.error ?? "Expense voided."); }); }}>{pending ? "Voiding…" : "Void expense"}</Button>{message ? <p role="status" className="text-sm font-bold text-rose-900">{message}</p> : null}</div>;
}
