import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import {
  cashMovementLabels,
  expenseCategoryLabels,
  formatShopDateTime,
} from "@/domain/phase5";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOperationalDataStartAt, isArchivedOperationalRecord } from "@/lib/operational-period";
import { ArchivedDataBanner } from "@/components/archived-data-banner";
import { getCashSessionSummary } from "@/server/cash-register-service";

export default async function CashSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("cash-register:operate");
  const { id } = await params;
  const [session, cutoff] = await Promise.all([
    db.cashSession.findUnique({
      where: { id },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
        payments: {
          include: {
            invoice: { select: { invoiceNumber: true } },
            reversal: true,
            recordedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        expenses: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        movements: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getOperationalDataStartAt(),
  ]);
  if (!session) notFound();
  const archived = isArchivedOperationalRecord(session.openedAt, cutoff);
  if (archived && user.role !== "ADMIN") notFound();
  const live = await getCashSessionSummary(session.id);
  const expected =
    session.expectedCash?.toFixed(2) ?? live.expectedCash.toFixed(2);
  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" className="mb-5">
        <Link href="/cash-register">
          <ArrowLeft className="size-5" />
          Cash Register
        </Link>
      </Button>
      <PageHeading
        eyebrow="Cash session"
        title={session.id.slice(-8).toUpperCase()}
        description={`${formatShopDateTime(session.openedAt)} · ${session.openedBy.name}`}
        action={<StatusBadge status={session.status} />}
      />
      {archived ? <ArchivedDataBanner /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-black">Session information</h2>
          <dl className="mt-4 grid gap-3">
            <Row label="Opened" value={formatShopDateTime(session.openedAt)} />
            <Row label="Opened by" value={session.openedBy.name} />
            <Row
              label="Closed"
              value={
                session.closedAt ? formatShopDateTime(session.closedAt) : "—"
              }
            />
            <Row label="Closed by" value={session.closedBy?.name ?? "—"} />
            {session.closingNote ? (
              <Row label="Closing note" value={session.closingNote} />
            ) : null}
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="font-black">Summary</h2>
          <dl className="mt-4 grid gap-3">
            <Row
              label="Opening Cash"
              value={`Rs. ${live.openingCash.toFixed(2)}`}
            />
            <Row
              label="Cash Receipts"
              value={`Rs. ${live.cashReceipts.toFixed(2)}`}
            />
            <Row
              label="Cash Deposits"
              value={`Rs. ${live.cashDeposits.toFixed(2)}`}
            />
            <Row
              label="Cash Expenses"
              value={`Rs. ${live.cashExpenses.toFixed(2)}`}
            />
            <Row
              label="Cash Withdrawals"
              value={`Rs. ${live.cashWithdrawals.toFixed(2)}`}
            />
            <Row label="Expected Cash" value={`Rs. ${expected}`} />
            <Row
              label="Actual Cash"
              value={
                session.actualCash
                  ? `Rs. ${session.actualCash.toFixed(2)}`
                  : "—"
              }
            />
            <Row
              label="Difference"
              value={
                session.difference
                  ? `Rs. ${session.difference.toFixed(2)}`
                  : "—"
              }
            />
          </dl>
        </Card>
      </div>
      <Card className="mt-5 p-6">
        <h2 className="font-black">Activity</h2>
        <div className="mt-4 space-y-3">
          {session.payments.map((item) => (
            <Entry
              key={item.id}
              title={`Cash payment · ${item.invoice.invoiceNumber}${item.reversal ? " · REVERSED" : ""}`}
              detail={`${item.recordedBy.name} · ${formatShopDateTime(item.createdAt)}`}
              amount={`Rs. ${item.amount.toFixed(2)}`}
            />
          ))}
          {session.expenses.map((item) => (
            <Entry
              key={item.id}
              title={`Expense · ${expenseCategoryLabels[item.category]}${item.status === "VOID" ? " · VOID" : ""}`}
              detail={`${item.createdBy.name} · ${formatShopDateTime(item.createdAt)}`}
              amount={`- Rs. ${item.amount.toFixed(2)}`}
            />
          ))}
          {session.movements.map((item) => (
            <Entry
              key={item.id}
              title={cashMovementLabels[item.type]}
              detail={`${item.reason} · ${item.createdBy.name} · ${formatShopDateTime(item.createdAt)}`}
              amount={`${item.type === "CASH_DEPOSIT" ? "+" : "-"} Rs. ${item.amount.toFixed(2)}`}
            />
          ))}
          {session.payments.length +
            session.expenses.length +
            session.movements.length ===
          0 ? (
            <p className="text-slate-500">No cash activity in this session.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-5 border-b pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-black">{value}</dd>
    </div>
  );
}
function Entry({
  title,
  detail,
  amount,
}: {
  title: string;
  detail: string;
  amount: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row">
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
      <p className="font-black">{amount}</p>
    </div>
  );
}
