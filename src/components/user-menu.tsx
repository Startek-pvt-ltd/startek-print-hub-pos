import { ChevronDown, LogOut, UserRound } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { logout } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

export function UserMenu({ user }: { user: { name: string; role: Role } }) {
  return (
    <details className="group relative">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left hover:bg-slate-50">
        <span className="grid size-9 place-items-center rounded-lg bg-blue-50 font-black text-blue-700">{user.name.charAt(0)}</span>
        <span className="hidden min-w-0 sm:block"><span className="block max-w-36 truncate text-sm font-bold text-slate-900">{user.name}</span><span className="block text-xs text-slate-500">{user.role}</span></span>
        <ChevronDown className="size-4 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-3"><UserRound className="size-5 text-blue-700" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">Signed in as {user.role}</p></div></div>
        <form action={logout} className="mt-2"><Button variant="ghost" className="w-full justify-start text-slate-700"><LogOut className="size-5" /> Sign out</Button></form>
      </div>
    </details>
  );
}
