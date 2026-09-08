"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuotationOutputActions({
  quotationId,
  quotationNumber,
}: {
  quotationId: string;
  quotationNumber: string;
}) {
  return (
    <div className="print:hidden">
      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild variant="secondary">
          <Link href={`/quotations/${quotationId}/pdf`} download={`${quotationNumber}.pdf`}>
            <Download className="size-5" />
            Download PDF
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-5" />
          Print A4 quotation
        </Button>
      </div>
      <p className="mt-3 text-right text-sm text-slate-500">
        In the print dialog, select Canon G3010, A4, portrait, and 100% scale.
      </p>
    </div>
  );
}
