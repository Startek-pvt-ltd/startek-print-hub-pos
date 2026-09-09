"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction } from "@/app/(workspace)/phase5-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { expenseCategoryLabels, paymentMethodLabels } from "@/domain/phase5";

export function ExpenseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  function submit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await createExpenseAction({ idempotencyKey, category: formData.get("category"), description: formData.get("description"), amount: formData.get("amount"), paymentMethod: formData.get("paymentMethod") });
      if (result.error) setMessage(result.error); else router.push(`/expenses/${result.data?.id}`);
    });
  }
  return <form action={submit} className="space-y-5">
    <label className="block font-bold">Category<select name="category" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">{Object.entries(expenseCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block font-bold">Description<Input className="mt-2" name="description" maxLength={500} required placeholder="What was purchased or paid?" /></label>
    <label className="block font-bold">Amount (Rs.)<Input className="mt-2" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required placeholder="0.00" /></label>
    <label className="block font-bold">Payment method<select name="paymentMethod" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cash expenses require an open register and reduce expected drawer cash. Non-cash expenses do not affect the drawer.</p>
    {message ? <p role="alert" className="rounded-xl bg-rose-50 p-4 font-bold text-rose-800">{message}</p> : null}
    <Button className="w-full" size="lg" disabled={pending}>{pending ? "Saving…" : "Record expense"}</Button>
  </form>;
}
