import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div className="max-w-md"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><FileQuestion className="size-8" /></div><p className="mt-6 text-sm font-black uppercase tracking-[.2em] text-blue-700">404</p><h1 className="mt-2 text-3xl font-black text-slate-950">Page not found</h1><p className="mt-3 text-slate-500">The requested POS page does not exist or may have moved.</p><Button asChild className="mt-7"><Link href="/dashboard">Go to dashboard</Link></Button></div>
    </main>
  );
}
