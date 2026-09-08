"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md text-center"><p className="text-sm font-black uppercase tracking-widest text-rose-600">Something went wrong</p><h1 className="mt-3 text-3xl font-black text-slate-950">The POS could not load this screen.</h1><p className="mt-3 text-slate-500">Try again. If the issue continues, contact the system administrator.</p><Button className="mt-6" onClick={reset}>Try again</Button></div></main>;
}
