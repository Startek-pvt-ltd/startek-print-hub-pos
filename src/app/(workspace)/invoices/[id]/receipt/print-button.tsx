"use client";

import { useCallback, useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consumeAutoprintUrl } from "@/domain/autoprint";
import { triggerBrowserPrint } from "@/domain/browser-printing";

export function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  const printReceipt = useCallback(() => triggerBrowserPrint(() => window.print()), []);

  useEffect(() => {
    if (!autoPrint) return;
    const cleanUrl = consumeAutoprintUrl(window.location.href);
    if (!cleanUrl) return;
    window.history.replaceState(window.history.state, "", cleanUrl);
    const frame = window.requestAnimationFrame(printReceipt);
    return () => window.cancelAnimationFrame(frame);
  }, [autoPrint, printReceipt]);

  return <div className="print:hidden"><div className="flex justify-end"><Button onClick={printReceipt}><Printer className="size-5" /> PRINT RECEIPT</Button></div></div>;
}
