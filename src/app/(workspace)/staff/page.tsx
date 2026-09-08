import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/auth";

export default async function StaffPage() {
  await requirePermission("staff:view");
  return <><PageHeading eyebrow="Administration" title="Staff" description="Manage staff access, account status, and role assignments." /><Card className="grid min-h-72 place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="size-8" /></div><h2 className="mt-5 text-xl font-black">Role security is active</h2><p className="mt-2 max-w-md text-slate-500">The seeded administrator is protected by server-side permissions. Staff-management forms will be completed with the operational controls phase.</p></div></Card></>;
}
