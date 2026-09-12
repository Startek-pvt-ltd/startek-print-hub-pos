"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetTodaySalesDisplay } from "./actions";

export function TodaySalesResetButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function reset() {
    if (!window.confirm("Reset the dashboard Today’s Sales display to zero? Historical invoices, payments, reports, and cash records will remain unchanged.")) return;
    startTransition(async () => {
      const result = await resetTodaySalesDisplay({ confirmation: "RESET_TODAY_SALES" });
      setMessage(result.error ?? "Today’s Sales display reset. New finalized invoices will accumulate from now.");
    });
  }

  return <div><Button type="button" variant="secondary" onClick={reset} disabled={pending} className="min-h-12"><RotateCcw className="size-5" />{pending ? "Resetting…" : "Reset Today’s Sales display"}</Button>{message ? <p role="status" className="mt-2 max-w-md text-xs font-bold text-slate-600">{message}</p> : null}</div>;
}
