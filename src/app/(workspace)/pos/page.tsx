import { PageHeading } from "@/components/page-heading";
import { PosBillingForm } from "./pos-billing-form";
import { requirePermission } from "@/lib/auth";

export default async function PosPage() {
  await requirePermission("pos:use");
  return <><PageHeading eyebrow="Billing" title="New invoice" description="Enter custom print work manually, take an optional payment, and finalize securely." /><PosBillingForm /></>;
}
