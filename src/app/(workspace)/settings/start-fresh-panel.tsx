"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Archive } from "lucide-react";
import { startFresh } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { START_FRESH_CONFIRMATION } from "@/lib/validations/maintenance";

export function StartFreshPanel({ currentCutoff }: { currentCutoff: string | null }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = confirmation === START_FRESH_CONFIRMATION && backupConfirmed;

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
    setBackupConfirmed(false);
  }

  function submit() {
    if (!ready) return;
    setMessage(null);
    startTransition(async () => {
      const result = await startFresh({ confirmation, backupConfirmed });
      if (result.error) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({ tone: "success", text: result.success ?? "A new operational period has started." });
        setOpen(false);
        setConfirmation("");
        setBackupConfirmed(false);
      }
    });
  }

  return <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><Archive className="size-6" /></div>
      <div>
        <h3 className="text-lg font-black text-rose-950">Start Fresh / Archive Test Data</h3>
        <p className="mt-1 text-sm text-rose-900">Start a clean operational period on this POS. Previous testing and go-live records will be archived from normal dashboards, lists, and reports but retained securely for audit and financial integrity.</p>
      </div>
    </div>
    <div className="mt-5 rounded-xl border border-rose-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Current operational start</p>
      <p className="mt-1 font-black text-slate-950">{currentCutoff ?? "All historical data is active."}</p>
      {currentCutoff ? <p className="mt-2 text-sm font-bold text-amber-800">A previous clean-start operation already exists. Starting again will archive the current operational period too.</p> : null}
    </div>
    <Button type="button" variant="danger" size="lg" className="mt-5" onClick={() => { setMessage(null); setOpen(true); }}>
      <AlertTriangle className="size-5" /> START FRESH
    </Button>
    {message ? <p role={message.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-xl p-4 font-bold ${message.tone === "error" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{message.text}</p> : null}

    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="start-fresh-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h2 id="start-fresh-title" className="flex items-center gap-3 text-2xl font-black text-rose-800"><AlertTriangle className="size-7" />Start a new operational period?</h2>
        <ul className="mt-5 list-disc space-y-2 pl-6 text-sm font-semibold text-slate-700">
          <li>Previous operational records will disappear from normal current views.</li>
          <li>Financial and audit data will still be retained securely.</li>
          <li>The active Cash Register session must be closed.</li>
          <li>A current backup must be downloaded and safely stored first.</li>
          <li>This action affects the whole Production POS.</li>
          {currentCutoff ? <li className="text-rose-800">A previous clean-start operation already exists.</li> : null}
        </ul>
        <label className="mt-6 flex min-h-12 items-start gap-3 rounded-xl border border-slate-200 p-4 font-bold text-slate-800">
          <input type="checkbox" className="mt-1 size-5" checked={backupConfirmed} onChange={(event) => setBackupConfirmed(event.target.checked)} />
          <span>I have downloaded and safely stored the latest Startek Print Hub POS backup.</span>
        </label>
        <label className="mt-5 block text-sm font-black text-slate-800">Type {START_FRESH_CONFIRMATION} exactly to confirm
          <Input className="mt-2" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="lg" onClick={close} disabled={pending}>Cancel</Button>
          <Button type="button" variant="danger" size="lg" onClick={submit} disabled={!ready || pending}>{pending ? "Starting…" : "Confirm Start Fresh"}</Button>
        </div>
      </div>
    </div> : null}
  </section>;
}
