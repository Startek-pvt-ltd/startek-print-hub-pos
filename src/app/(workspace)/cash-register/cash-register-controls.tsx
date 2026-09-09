"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCashMovementAction, closeCashSessionAction, openCashSessionAction } from "@/app/(workspace)/phase5-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CashRegisterControls({ sessionId, expectedCash, allowAdjust }: { sessionId?: string; expectedCash?: string; allowAdjust: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState("");
  const [openKey] = useState(() => crypto.randomUUID()); const [closeKey] = useState(() => crypto.randomUUID()); const [movementKey, setMovementKey] = useState(() => crypto.randomUUID()); const [actualCash, setActualCash] = useState("");
  if (!sessionId) return <form action={(formData) => startTransition(async () => { const result = await openCashSessionAction({ idempotencyKey: openKey, openingCash: formData.get("openingCash") }); setMessage(result.error ?? "Register opened."); if (!result.error) router.refresh(); })} className="space-y-4"><label className="block font-bold">Opening Cash (Rs.)<Input className="mt-2" name="openingCash" type="number" min="0" step="0.01" inputMode="decimal" required placeholder="0.00" /></label>{message ? <Message value={message} /> : null}<Button className="w-full" size="lg" disabled={pending}>{pending ? "Opening…" : "Open register"}</Button></form>;
  const difference = actualCash && expectedCash ? Number(actualCash) - Number(expectedCash) : null;
  return <div className="space-y-6">
    {allowAdjust ? <form action={(formData) => startTransition(async () => { const result = await addCashMovementAction({ idempotencyKey: movementKey, type: formData.get("type"), amount: formData.get("amount"), reason: formData.get("reason") }); setMessage(result.error ?? "Cash movement recorded."); if (!result.error) { setMovementKey(crypto.randomUUID()); router.refresh(); } })} className="space-y-3 rounded-xl border p-4"><h3 className="font-black">Controlled cash movement</h3><select name="type" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"><option value="CASH_DEPOSIT">Cash Deposit</option><option value="CASH_WITHDRAWAL">Cash Withdrawal</option></select><Input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required placeholder="Amount" /><Input name="reason" required minLength={3} maxLength={500} placeholder="Required reason" /><Button variant="secondary" disabled={pending}>Record movement</Button></form> : null}
    <form action={(formData) => { if (!confirm("Close this register? The session will become immutable.")) return; startTransition(async () => { const result = await closeCashSessionAction({ cashSessionId: sessionId, idempotencyKey: closeKey, actualCash: formData.get("actualCash"), closingNote: formData.get("closingNote") }); setMessage(result.error ?? "Register closed."); if (!result.error) router.refresh(); }); }} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><h3 className="font-black text-blue-950">Close register</h3><label className="block font-bold">Actual Cash (Rs.)<Input className="mt-2" name="actualCash" value={actualCash} onChange={(event) => setActualCash(event.target.value)} type="number" min="0" step="0.01" inputMode="decimal" required placeholder="Counted drawer cash" /></label>{difference !== null && Number.isFinite(difference) ? <p className={`rounded-xl p-3 font-black ${difference === 0 ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>Difference: Rs. {difference.toFixed(2)}</p> : null}<Input name="closingNote" maxLength={500} placeholder="Closing note (optional)" /><Button className="w-full" size="lg" disabled={pending}>{pending ? "Closing…" : "Close register"}</Button></form>
    {message ? <Message value={message} /> : null}
  </div>;
}

function Message({ value }: { value: string }) { return <p role="status" className="rounded-xl bg-slate-100 p-4 font-bold">{value}</p>; }
