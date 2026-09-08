import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return <Card className="mx-auto max-w-xl p-10 text-center"><ShieldX className="mx-auto size-14 text-rose-600" /><h1 className="mt-5 text-3xl font-black">Access restricted</h1><p className="mt-3 text-slate-500">Your staff role does not permit this action. Ask an administrator if your responsibilities have changed.</p><Button asChild className="mt-6"><Link href="/dashboard">Return to dashboard</Link></Button></Card>;
}
