import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";

export function PhasePlaceholder({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <>
      <PageHeading eyebrow={phase} title={title} description={description} />
      <Card className="grid min-h-72 place-items-center p-8 text-center">
        <div><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Construction className="size-8" /></div><h2 className="mt-5 text-xl font-black text-slate-900">Module shell ready</h2><p className="mx-auto mt-2 max-w-md text-slate-500">Navigation and access control are in place. Transaction behavior will be implemented in its scheduled phase.</p></div>
      </Card>
    </>
  );
}
