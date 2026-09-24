"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banknote, BarChart3, Calculator, FileText, LayoutDashboard, LogOut, PackageCheck, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, Users, WalletCards } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { logout } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { hasPermission, ownerRoleLabel, type Permission } from "@/lib/permissions";
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

const sidebarKey = "stph.sidebar.v1";
function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("stph-sidebar", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("stph-sidebar", callback); };
}
function sidebarSnapshot() { return window.localStorage.getItem(sidebarKey) === "collapsed"; }
function serverSidebarSnapshot() { return false; }

export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; role: Role } }) {
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, serverSidebarSnapshot);
  const roleLabel = ownerRoleLabel(user.role);
  function toggleSidebar() {
    window.localStorage.setItem(sidebarKey, collapsed ? "expanded" : "collapsed");
    window.dispatchEvent(new Event("stph-sidebar"));
  }
  return (
    <div className={`min-h-screen lg:grid ${collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[270px_1fr]"}`}>
      <aside className="border-b border-blue-900 bg-[#061b3e] text-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex min-h-20 items-center justify-between px-5 lg:min-h-24 lg:justify-start lg:gap-3">
          <Image src="/brand/startek-logo.png" alt="Startek Print Hub" width={52} height={52} className="rounded-xl object-cover" />
          <div className={collapsed ? "lg:hidden" : ""}><p className="font-black tracking-wide">STARTEK</p><p className="text-xs tracking-[.22em] text-sky-300">PRINT HUB POS</p></div>
          <span className="rounded-full bg-blue-800 px-3 py-1 text-xs font-bold lg:hidden">{roleLabel}</span>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto lg:pb-4" aria-label="Primary navigation">
          {navigation.filter((item) => hasPermission(user.role, item.permission)).map((item) => (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-bold text-blue-100 transition hover:bg-white/10 hover:text-white ${collapsed ? "lg:justify-center" : ""}`}>
              <item.icon className="size-5 text-sky-300" /> <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden shrink-0 border-t border-white/10 p-4 lg:block">
          <div className="mb-3 flex items-center gap-3 px-2"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-400 font-black text-blue-950">{user.name.charAt(0)}</div><div className={`min-w-0 ${collapsed ? "hidden" : ""}`}><p className="truncate text-sm font-bold">{user.name}</p><p className="text-xs text-blue-300">{roleLabel}</p></div></div>
          <form action={logout}><Button variant="ghost" title={collapsed ? "Sign out" : undefined} className={`w-full text-blue-100 hover:bg-white/10 hover:text-white ${collapsed ? "justify-center px-0" : "justify-start"}`}><LogOut className="size-5" /> <span className={collapsed ? "sr-only" : ""}>Sign out</span></Button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 print:hidden sm:px-8">
          <div className="flex items-center gap-3"><Button type="button" variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:inline-flex" aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}</Button><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Startek Print Hub</p><p className="mt-1 text-sm text-slate-500">Touch POS workspace · Asia/Colombo</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 md:flex"><WalletCards className="size-5 text-blue-700" /> LKR · Rs.</div><UserMenu user={user} /></div>
        </header>
        <main className="p-5 print:p-0 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
