"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { CheckCircle2, History, Plus, Search, Trash2 } from "lucide-react";
import { calculateInvoiceTotals, formatMoney } from "@/domain/financial";
import { finalizeInvoice, findCustomerByPhone } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/generated/prisma/client";

type BillingForm = {
  customerName: string; customerPhone: string; discount: string;
  items: Array<{ description: string; quantity: string; unitPrice: string }>;
  paymentAmount: string; paymentMethod: PaymentMethod; paymentReference: string;
};

const blankValues: BillingForm = {
  customerName: "", customerPhone: "", discount: "0.00",
  items: [{ description: "", quantity: "1", unitPrice: "" }],
  paymentAmount: "", paymentMethod: "CASH", paymentReference: "",
};

export function PosBillingForm() {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [serverError, setServerError] = useState<string>();
  const [success, setSuccess] = useState<{ id: string; invoiceNumber: string; customerName: string; grandTotal: string; paid: string; outstanding: string }>();
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<BillingForm>({ defaultValues: blankValues });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const discount = useWatch({ control, name: "discount" });
  const paymentAmount = useWatch({ control, name: "paymentAmount" });

  const display = useMemo(() => {
    try {
      const totals = calculateInvoiceTotals(watchedItems.map((item) => ({ quantity: item.quantity || 0, unitPrice: item.unitPrice || 0 })), discount || 0);
      const paid = paymentAmount ? Number(paymentAmount) : 0;
      return { lines: totals.lineTotals.map(formatMoney), subtotal: formatMoney(totals.subtotal), discount: formatMoney(totals.discount), total: formatMoney(totals.grandTotal), paid: formatMoney(paid), balance: formatMoney(Math.max(0, Number(totals.grandTotal) - paid)) };
    } catch {
      return { lines: watchedItems.map(() => "0.00"), subtotal: "0.00", discount: "0.00", total: "0.00", paid: "0.00", balance: "0.00" };
    }
  }, [watchedItems, discount, paymentAmount]);

  const submit = handleSubmit((values) => {
    setServerError(undefined);
    startTransition(async () => {
      const result = await finalizeInvoice({
        idempotencyKey, customerName: values.customerName, customerPhone: values.customerPhone,
        discount: values.discount || "0", items: values.items,
        initialPayment: values.paymentAmount === "" ? null : { amount: values.paymentAmount, method: values.paymentMethod, reference: values.paymentReference },
      });
      if (result.error) setServerError(result.error);
      else if (result.data) setSuccess(result.data);
    });
  });

  function newInvoice() {
    reset(blankValues); setSuccess(undefined); setServerError(undefined); setIdempotencyKey(crypto.randomUUID());
  }

  function lookupCustomer() {
    const phoneNumber = getValues("customerPhone");
    startTransition(async () => {
      const result = await findCustomerByPhone({ phoneNumber });
      if (result.error) setServerError(result.error);
      else if (result.data) { setValue("customerName", result.data.name, { shouldValidate: true }); setServerError(undefined); }
      else setServerError("No existing customer found. Enter a name to create one with this invoice.");
    });
  }

  if (success) return <InvoiceSuccess invoice={success} onNew={newInvoice} />;

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-950">Customer</h2><p className="mt-1 text-sm text-slate-500">Optional for walk-in billing. Enter both fields to save a customer.</p></div><Button asChild variant="secondary"><Link href="/invoices"><History className="size-5" /> History</Link></Button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-bold text-slate-700">Customer name</span><Input {...register("customerName")} placeholder="Walk-in or customer name" /></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">Phone number</span><div className="flex gap-2"><Input {...register("customerPhone")} inputMode="tel" placeholder="07XXXXXXXX" /><Button type="button" variant="secondary" size="icon" onClick={lookupCustomer} aria-label="Find customer by phone"><Search className="size-5" /></Button></div></label>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6"><div><h2 className="text-xl font-black text-slate-950">Manual billing items</h2><p className="mt-1 text-sm text-slate-500">Type each custom print service directly.</p></div><Button type="button" onClick={() => append({ description: "", quantity: "1", unitPrice: "" })}><Plus className="size-5" /> Add item</Button></div>
          <div className="space-y-4 p-5 sm:p-6">
            {fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(220px,1fr)_120px_160px_140px_52px] lg:items-end">
              <label><span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><Input {...register(`items.${index}.description`, { required: "Description is required" })} placeholder="e.g. Banner printing" />{errors.items?.[index]?.description ? <span className="mt-1 block text-xs text-rose-700">{errors.items[index]?.description?.message}</span> : null}</label>
              <label><span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Qty</span><Input {...register(`items.${index}.quantity`, { required: true })} inputMode="decimal" /></label>
              <label><span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Unit price</span><Input {...register(`items.${index}.unitPrice`, { required: true })} inputMode="decimal" placeholder="0.00" /></label>
              <div><span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Amount</span><div className="flex min-h-12 items-center rounded-xl bg-white px-4 font-black text-slate-950">Rs. {display.lines[index] ?? "0.00"}</div></div>
              <Button type="button" variant="danger" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length === 1} aria-label={`Remove item ${index + 1}`}><Trash2 className="size-5" /></Button>
            </div>)}
          </div>
        </Card>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <Card className="p-6"><h2 className="text-xl font-black">Totals</h2><div className="mt-5 space-y-3 text-sm"><TotalRow label="Subtotal" value={display.subtotal} /><label className="flex items-center justify-between gap-4"><span className="font-bold text-slate-600">Discount</span><Input {...register("discount")} className="w-32 text-right" inputMode="decimal" /></label><div className="border-t-2 border-slate-900 pt-4"><TotalRow label="Grand total" value={display.total} strong /></div></div></Card>
        <Card className="p-6"><h2 className="text-xl font-black">Initial payment</h2><p className="mt-1 text-sm text-slate-500">Optional advance, partial, or full payment.</p><div className="mt-5 space-y-4"><label><span className="mb-2 block text-sm font-bold">Amount</span><Input {...register("paymentAmount")} inputMode="decimal" placeholder="0.00" /></label><label><span className="mb-2 block text-sm font-bold">Method</span><select {...register("paymentMethod")} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-bold"><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="QR">QR Payment</option></select></label><label><span className="mb-2 block text-sm font-bold">Reference</span><Input {...register("paymentReference")} placeholder="Optional" /></label></div><div className="mt-5 border-t border-slate-200 pt-4"><TotalRow label="Paid" value={display.paid} /><TotalRow label="Balance" value={display.balance} strong /></div></Card>
        {serverError ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{serverError}</p> : null}
        <Button size="lg" className="w-full text-base" disabled={pending}>{pending ? "Finalizing…" : "Finalize invoice"}</Button>
      </aside>
    </form>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex items-center justify-between ${strong ? "text-lg font-black text-slate-950" : "font-bold text-slate-600"}`}><span>{label}</span><span>Rs. {value}</span></div>; }

function InvoiceSuccess({ invoice, onNew }: { invoice: { id: string; invoiceNumber: string; customerName: string; grandTotal: string; paid: string; outstanding: string }; onNew: () => void }) {
  return <Card className="mx-auto max-w-2xl p-8 text-center sm:p-10"><div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-9" /></div><p className="mt-5 text-sm font-black uppercase tracking-[.18em] text-emerald-700">Invoice created</p><h2 className="mt-2 text-3xl font-black text-slate-950">{invoice.invoiceNumber}</h2><p className="mt-2 text-slate-500">{invoice.customerName}</p><div className="mt-7 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3"><TotalRow label="Total" value={invoice.grandTotal} strong /><TotalRow label="Paid" value={invoice.paid} /><TotalRow label="Balance" value={invoice.outstanding} strong /></div><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild><Link href={`/invoices/${invoice.id}`}>View invoice</Link></Button><Button asChild variant="secondary"><Link href={`/invoices/${invoice.id}/receipt`}>Print receipt</Link></Button><Button type="button" variant="secondary" onClick={onNew}>New invoice</Button></div></Card>;
}
