import Image from "next/image";
import Link from "next/link";
import { Banknote, BarChart3, Calculator, FileText, LayoutDashboard, LogOut, PackageCheck, ReceiptText, Settings, Users, WalletCards } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { logout } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { hasPermission, type Permission } from "@/lib/permissions";
import { UserMenu } from "@/components/user-menu";

const navigation: Array<{ label: string; href: string; icon: typeof LayoutDashboard; permission: Permission }> = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "POS Billing", href: "/pos", icon: Calculator, permission: "pos:use" },
  { label: "Invoices", href: "/invoices", icon: ReceiptText, permission: "invoices:view" },
  { label: "Orders", href: "/orders", icon: PackageCheck, permission: "orders:view" },
  { label: "Quotations", href: "/quotations", icon: FileText, permission: "quotations:manage" },
  { label: "Expenses", href: "/expenses", icon: ReceiptText, permission: "expenses:manage" },
  { label: "Cash Register", href: "/cash-register", icon: Banknote, permission: "cash-register:operate" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "Staff", href: "/staff", icon: Users, permission: "staff:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];

export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; role: Role } }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="border-b border-blue-900 bg-[#061b3e] text-white print:hidden lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex min-h-20 items-center justify-between px-5 lg:min-h-24 lg:justify-start lg:gap-3">
          <Image src="/brand/startek-logo.png" alt="Startek Print Hub" width={52} height={52} className="rounded-xl object-cover" />
          <div><p className="font-black tracking-wide">STARTEK</p><p className="text-xs tracking-[.22em] text-sky-300">PRINT HUB POS</p></div>
          <span className="rounded-full bg-blue-800 px-3 py-1 text-xs font-bold lg:hidden">{user.role}</span>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0" aria-label="Primary navigation">
          {navigation.filter((item) => hasPermission(user.role, item.permission)).map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white">
              <item.icon className="size-5 text-sky-300" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="mb-3 flex items-center gap-3 px-2"><div className="grid size-10 place-items-center rounded-full bg-sky-400 font-black text-blue-950">{user.name.charAt(0)}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="text-xs text-blue-300">{user.role}</p></div></div>
          <form action={logout}><Button variant="ghost" className="w-full justify-start text-blue-100 hover:bg-white/10 hover:text-white"><LogOut className="size-5" /> Sign out</Button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 print:hidden sm:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Startek Print Hub</p><p className="mt-1 text-sm text-slate-500">Touch POS workspace · Asia/Colombo</p></div>
          <div className="flex items-center gap-3"><div className="hidden min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 md:flex"><WalletCards className="size-5 text-blue-700" /> LKR · Rs.</div><UserMenu user={user} /></div>
        </header>
        <main className="p-5 print:p-0 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
