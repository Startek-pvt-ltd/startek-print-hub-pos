import Link from "next/link";
import { notFound } from "next/navigation";
import type { OrderStatus } from "@/generated/prisma/client";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertOrderTransition, dueState, shopDate } from "@/domain/phase4";
import { invoiceAmounts, derivePaymentState } from "@/domain/invoice-view";
import { hasPermission } from "@/lib/permissions";
import {
  getOperationalDataStartAt,
  isArchivedOperationalRecord,
} from "@/lib/operational-period";
import { ArchivedDataBanner } from "@/components/archived-data-banner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { OrderActions } from "./order-actions";
const candidates: OrderStatus[] = [
  "DESIGNING",
  "WAITING_APPROVAL",
  "APPROVED",
  "PRINTING",
  "FINISHING",
  "READY",
  "DELIVERED",
];
const labels: Record<string, string> = {
  DESIGNING: "Start designing",
  WAITING_APPROVAL: "Send for approval",
  APPROVED: "Mark approved",
  PRINTING: "Start printing",
  FINISHING: "Start finishing",
  READY: "Mark ready",
  DELIVERED: "Mark delivered",
};
export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("orders:view");
  const { id } = await params;
  const [o, staff, cutoff] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        assignedStaff: { select: { name: true } },
        quotation: true,
        items: { orderBy: { sortOrder: "asc" } },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: { changedBy: { select: { name: true } } },
        },
        invoice: { include: { payments: { include: { reversal: true } } } },
      },
    }),
    db.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    getOperationalDataStartAt(),
  ]);
  if (!o) notFound();
  const archived = isArchivedOperationalRecord(o.createdAt, cutoff);
  if (archived && user.role !== "ADMIN") notFound();
  if (
    (user.role === "DESIGNER" || user.role === "PRODUCTION") &&
    o.assignedStaffId &&
    o.assignedStaffId !== user.id
  )
    notFound();
  const next = candidates.flatMap((s) => {
    try {
      assertOrderTransition(o.status, s, user.role);
      return [{ status: s, label: labels[s] }];
    } catch {
      return [];
    }
  });
  const ds = dueState(o.dueDate, o.status, shopDate());
  const ledger =
    o.invoice?.payments.map((p) => ({
      amount: p.amount.toString(),
      reversed: Boolean(p.reversal),
    })) ?? [];
  const amounts = o.invoice
    ? invoiceAmounts(o.invoice.grandTotal.toString(), ledger)
    : null;
  return (
    <>
      <Button asChild variant="ghost" className="mb-5">
        <Link href="/orders">
          <ArrowLeft className="size-5" />
          Orders
        </Link>
      </Button>
      <PageHeading
        eyebrow="Order detail"
        title={o.orderNumber}
        description={`${o.customerNameSnapshot} · ${o.customerPhoneSnapshot}`}
        action={<StatusBadge status={o.status} />}
      />
      {archived ? <ArchivedDataBanner /> : null}
      {ds && ds !== "UPCOMING" ? (
        <div
          className={`mb-5 rounded-xl p-4 font-black ${ds === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}
        >
          {ds.replace("_", " ")} · {o.dueDate?.toISOString().slice(0, 10)}
        </div>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-black">Print job</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info l="Job name" v={o.jobName ?? "—"} />
              <Info
                l="Due date"
                v={o.dueDate?.toISOString().slice(0, 10) ?? "—"}
              />
              <Info
                l="Assigned staff"
                v={o.assignedStaff?.name ?? "Unassigned"}
              />
              <Info l="Created by" v={o.createdBy.name} />
            </div>
            {o.notes ? (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4">
                {o.notes}
              </p>
            ) : null}
          </Card>
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Description / job details</th>
                  <th className="p-4">Qty</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr className="border-t align-top" key={i.id}>
                    <td className="p-4">
                      <b>{i.description}</b>
                      <dl className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <span>Size: {i.size ?? "—"}</span>
                        <span>Material: {i.material ?? "—"}</span>
                        <span>Finishing: {i.finishing ?? "—"}</span>
                        <span>Design: {i.designInstructions ?? "—"}</span>
                        <span className="sm:col-span-2">
                          Notes: {i.additionalNotes ?? "—"}
                        </span>
                      </dl>
                    </td>
                    <td className="p-4">{i.quantity.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="p-5">
            <h2 className="font-black">Workflow history</h2>
            <div className="mt-4 space-y-3">
              {o.statusHistory.map((h) => (
                <div key={h.id} className="rounded-xl bg-slate-50 p-4">
                  <b>
                    {h.previousStatus ? `${h.previousStatus} → ` : ""}
                    {h.newStatus}
                  </b>
                  <p className="text-sm text-slate-500">
                    {fmt(h.createdAt)} · {h.changedBy.name}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="font-black">Relationships</h2>
            <div className="mt-4 grid gap-3">
              {o.quotation ? (
                <Button asChild variant="secondary">
                  <Link href={`/quotations/${o.quotation.id}`}>
                    {o.quotation.quotationNumber}
                  </Link>
                </Button>
              ) : (
                <p>No source quotation</p>
              )}
              {o.invoice ? (
                <Button asChild>
                  <Link href={`/invoices/${o.invoice.id}`}>
                    {o.invoice.invoiceNumber}
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-slate-500">No invoice yet</p>
              )}
            </div>
          </Card>
          {o.invoice && amounts ? (
            <Card className="p-5">
              <h2 className="font-black">Invoice financials</h2>
              <div className="mt-4 space-y-2">
                <Money l="Grand total" v={o.invoice.grandTotal.toFixed(2)} />
                <Money l="Paid" v={amounts.paid} />
                <Money l="Outstanding" v={amounts.outstanding} />
                <div className="pt-2">
                  <StatusBadge
                    status={derivePaymentState(
                      o.invoice.status,
                      o.invoice.grandTotal.toString(),
                      ledger,
                    )}
                  />
                </div>
              </div>
            </Card>
          ) : o.quotation ? (
            <Card className="p-5">
              <h2 className="font-black">Quoted total</h2>
              <p className="mt-2 text-2xl font-black">
                Rs. {o.quotation.grandTotal.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                The quotation remains authoritative until an invoice exists.
              </p>
            </Card>
          ) : null}
        </aside>
      </div>
      {!archived ? <div className="mt-5">
        <OrderActions
          id={o.id}
          status={o.status}
          next={next}
          canCancel={hasPermission(user.role, "orders:cancel")}
          canAssign={hasPermission(user.role, "orders:assign")}
          canEdit={hasPermission(user.role, "orders:edit")}
          canInvoice={hasPermission(user.role, "orders:create-invoice")}
          invoiceId={o.invoice?.id ?? null}
          staff={staff}
          initial={{
            jobName: o.jobName ?? "",
            dueDate: o.dueDate?.toISOString().slice(0, 10) ?? "",
            notes: o.notes ?? "",
            assignedStaffId: o.assignedStaffId ?? "",
            items: o.items.map((i) => ({
              id: i.id,
              description: i.description,
              size: i.size ?? "",
              material: i.material ?? "",
              finishing: i.finishing ?? "",
              designInstructions: i.designInstructions ?? "",
              additionalNotes: i.additionalNotes ?? "",
            })),
          }}
        />
      </div> : null}
    </>
  );
}
function Info({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-500">{l}</p>
      <p className="mt-1 font-bold">{v}</p>
    </div>
  );
}
function Money({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between font-bold">
      <span>{l}</span>
      <span>Rs. {v}</span>
    </div>
  );
}
function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(d);
}
