import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#061b3e] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,177,255,.22),transparent_32%),linear-gradient(145deg,transparent_48%,rgba(16,169,230,.10)_48%,rgba(16,169,230,.10)_51%,transparent_51%)]" />
        <div className="relative flex items-center gap-4">
          <Image src="/brand/startek-logo.png" alt="Startek Print Hub" width={72} height={72} className="rounded-2xl object-cover" priority />
          <div><p className="text-xl font-black tracking-wide">STARTEK</p><p className="text-sm tracking-[.28em] text-sky-300">PRINT HUB</p></div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[.2em] text-sky-300">Point of Sale</p>
          <h1 className="text-5xl font-black leading-tight">Fast billing for custom print work.</h1>
          <p className="mt-5 text-lg leading-8 text-blue-100">Manual item entry, payment tracking, print-job workflow, and accountable cash operations in one touch-friendly workspace.</p>
        </div>
        <p className="relative text-sm text-blue-200">No.62 Padukka Road, Meegoda · 070 593 5320</p>
      </section>
      <section className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-blue-950/5 sm:p-10">
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/brand/startek-logo.png" alt="Startek Print Hub" width={56} height={56} className="rounded-xl" priority />
            <strong className="text-lg">Startek Print Hub</strong>
          </div>
          <p className="mt-8 text-sm font-bold uppercase tracking-[.18em] text-blue-700 lg:mt-0">Staff access</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Welcome back</h2>
          <p className="mt-2 text-slate-500">Sign in to open the POS workspace.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
