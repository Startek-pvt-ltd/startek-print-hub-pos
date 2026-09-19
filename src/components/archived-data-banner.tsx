import { Archive } from "lucide-react";

export function ArchivedDataBanner() {
  return <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
    <Archive className="mt-0.5 size-6 shrink-0" />
    <div><p className="font-black">ARCHIVED / PRE-GO-LIVE DATA</p><p className="mt-1 text-sm font-semibold">This retained record is available to administrators for audit and financial integrity. It is excluded from normal operational views and cannot be changed.</p></div>
  </div>;
}
