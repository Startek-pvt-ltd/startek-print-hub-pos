"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { saveSettings, type SettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";

export function SettingsForm({ values, editable }: { values: SettingsInput; editable: boolean }) {
  const [state, setState] = useState<SettingsState>({});
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: values });
  const onSubmit = handleSubmit((data) => {
    setState({});
    startTransition(async () => setState(await saveSettings(data)));
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {!editable ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Manager access is read-only. An administrator must make settings changes.</p> : null}
      <fieldset className="grid gap-5 sm:grid-cols-2"><legend className="mb-5 text-lg font-black text-slate-950">Business identity</legend>
        <Field label="Business name" error={errors.businessName?.message} className="sm:col-span-2"><Input {...register("businessName")} disabled={!editable} /></Field>
        <Field label="Address" error={errors.address?.message} className="sm:col-span-2"><Input {...register("address")} disabled={!editable} /></Field>
        <Field label="Primary phone" error={errors.phonePrimary?.message}><Input {...register("phonePrimary")} inputMode="tel" disabled={!editable} /></Field>
        <Field label="Secondary phone" error={errors.phoneSecond?.message}><Input {...register("phoneSecond")} inputMode="tel" disabled={!editable} /></Field>
        <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><Input {...register("email")} type="email" disabled={!editable} /></Field>
      </fieldset>
      <fieldset className="grid gap-5 sm:grid-cols-2"><legend className="mb-5 text-lg font-black text-slate-950">Locale and receipt</legend>
        <Field label="Currency"><Input {...register("currencyCode")} readOnly /></Field>
        <Field label="Display currency"><Input {...register("displayCurrency")} readOnly /></Field>
        <Field label="Timezone"><Input {...register("timeZone")} readOnly /></Field>
        <Field label="Receipt width"><Input {...register("receiptWidth")} readOnly /></Field>
        <input type="hidden" {...register("printerModel")} />
        <input type="hidden" {...register("printerConnection")} />
      </fieldset>
      <fieldset className="grid gap-5 sm:grid-cols-2"><legend className="mb-5 text-lg font-black text-slate-950">Document numbering</legend>
        <Field label="Invoice prefix" error={errors.invoicePrefix?.message}><Input {...register("invoicePrefix")} disabled={!editable} /></Field>
        <Field label="Order prefix" error={errors.orderPrefix?.message}><Input {...register("orderPrefix")} disabled={!editable} /></Field>
        <Field label="Quotation prefix" error={errors.quotePrefix?.message}><Input {...register("quotePrefix")} disabled={!editable} /></Field>
        <Field label="Expense prefix" error={errors.expensePrefix?.message}><Input {...register("expensePrefix")} disabled={!editable} /></Field>
      </fieldset>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-700">{state.success}</p> : null}
      {editable ? <Button size="lg" disabled={pending}><Save className="size-5" /> {pending ? "Saving…" : "Save settings"}</Button> : null}
    </form>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>{children}{error ? <span className="mt-2 block text-sm font-semibold text-rose-700">{error}</span> : null}</label>;
}
