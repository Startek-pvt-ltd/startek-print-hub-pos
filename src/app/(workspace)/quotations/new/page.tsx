import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/auth";
import { QuotationForm } from "../quotation-form";
export default async function NewQuotationPage() { await requirePermission("quotations:manage"); return <><PageHeading eyebrow="Quotations" title="New quotation" description="Build a customer quotation from immutable manual item snapshots." /><QuotationForm /></>; }
