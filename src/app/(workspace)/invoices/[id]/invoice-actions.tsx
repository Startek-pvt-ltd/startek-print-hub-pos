"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Ban } from "lucide-react";
import { formatMoney, resolvePayment } from "@/domain/financial";
import { recordBalancePayment, voidInvoice } from "@/app/(workspace)/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/generated/prisma/client";

export function InvoiceActions({ invoiceId, canPay, canVoid, outstanding, isVoid }: { invoiceId: string; canPay: boolean; canVoid: boolean; outstanding: string; isVoid: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  let preview: { applied: string; change: string } | null = null;
  try {
    if (amount) {
      const payment = resolvePayment(amount, outstanding, method);
      preview = { applied: formatMoney(payment.amount), change: formatMoney(payment.changeGiven ?? 0) };
    }
  } catch {
    preview = null;
  }

  function submitPayment(formData: FormData) {
    startTransition(async () => {
      const result = await recordBalancePayment({ invoiceId, amount: formData.get("amount"), method, reference: formData.get("reference") });
      if (result.error) setMessage(result.error); else { setMessage(result.data?.changeGiven && Number(result.data.changeGiven) > 0 ? `Payment recorded. Change due: Rs. ${result.data.changeGiven}` : "Payment recorded successfully"); setAmount(""); router.refresh(); }
    });
  }

  function submitVoid(formData: FormData) {
    if (!window.confirm("Void this invoice? The invoice and payment history will be preserved.")) return;
    startTransition(async () => {
      const result = await voidInvoice({ invoiceId, reason: formData.get("reason") });
      if (result.error) setMessage(result.error); else { setMessage("Invoice voided"); router.refresh(); }
    });
  }

  if (isVoid) return null;
  return <div className="grid gap-5 lg:grid-cols-2">{canPay && Number(outstanding) > 0 ? <form action={submitPayment} className="rounded-2xl border border-slate-200 p-5"><h3 className="flex items-center gap-2 font-black"><Banknote className="size-5 text-emerald-700" /> Record balance payment</h3><p className="mt-1 text-sm text-slate-500">Outstanding: Rs. {outstanding}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input name="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={method === "CASH" ? "Cash tendered" : "Payment amount"} required /><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="QR">QR</option></select><Input name="reference" placeholder="Reference (optional)" className="sm:col-span-2" /></div>{preview ? <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>Payment applied: Rs. {preview.applied}</span><span>Change due: Rs. {preview.change}</span></div> : null}<Button className="mt-4" disabled={pending}>Record payment</Button></form> : null}{canVoid ? <form action={submitVoid} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5"><h3 className="flex items-center gap-2 font-black text-rose-800"><Ban className="size-5" /> Void invoice</h3><p className="mt-1 text-sm text-rose-700">This does not delete the invoice or its payments.</p><Input name="reason" placeholder="Required void reason" className="mt-4" required minLength={3} /><Button variant="danger" className="mt-4" disabled={pending}>Void invoice</Button></form> : null}{message ? <p role="status" className="lg:col-span-2 rounded-xl bg-slate-100 p-4 font-bold text-slate-700">{message}</p> : null}</div>;
}
