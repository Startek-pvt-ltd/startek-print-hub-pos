"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consumeAutoprintUrl } from "@/domain/autoprint";

export function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const cleanUrl = consumeAutoprintUrl(window.location.href);
    if (!cleanUrl) return;
    window.history.replaceState(window.history.state, "", cleanUrl);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(frame);
  }, [autoPrint]);

  return <Button onClick={() => window.print()} className="print:hidden"><Printer className="size-5" /> Open print dialog</Button>;
}
