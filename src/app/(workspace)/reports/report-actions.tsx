"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions({ downloadUrl }: { downloadUrl?: string }) {
  return <div className="flex gap-2 print:hidden"><Button type="button" variant="secondary" onClick={() => window.print()}><Printer className="size-5" />Print A4</Button>{downloadUrl ? <Button asChild><a href={downloadUrl}><Download className="size-5" />Download CSV</a></Button> : null}</div>;
}
