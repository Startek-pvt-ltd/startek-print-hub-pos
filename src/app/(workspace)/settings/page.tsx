import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { SettingsForm } from "./settings-form";
import { BackupRestorePanel } from "./backup-restore-panel";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getLastBackupAudit } from "@/server/backup-service";
import { APPLICATION_VERSION, SCHEMA_VERSION } from "@/domain/backup";

const defaults = {
  businessName: "Startek Print Hub",
  address: "No.62 Padukka Road, Meegoda",
  phonePrimary: "0705935320",
  phoneSecond: "0777250493",
  email: "startekprinthub@gmail.com",
  currencyCode: "LKR" as const,
  displayCurrency: "Rs." as const,
  timeZone: "Asia/Colombo" as const,
  receiptWidth: "80mm" as const,
  printerModel: "Xprinter XP-80T",
  printerConnection: "USB" as const,
  invoicePrefix: "SPH-INV",
  orderPrefix: "SPH-ORD",
  quotePrefix: "SPH-QT",
  expensePrefix: "SPH-EXP",
};

const shopDateTime = new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" });

export default async function SettingsPage() {
  const user = await requirePermission("settings:view");
  const canManageBackups = hasPermission(user.role, "backups:manage");
  const [settings, lastBackup] = await Promise.all([
    db.setting.findUnique({ where: { id: "primary" } }),
    canManageBackups ? getLastBackupAudit() : Promise.resolve(null),
  ]);
  const values = settings ? {
    businessName: settings.businessName, address: settings.address,
    phonePrimary: settings.phonePrimary, phoneSecond: settings.phoneSecond,
    email: settings.email, currencyCode: "LKR" as const,
    displayCurrency: "Rs." as const, timeZone: "Asia/Colombo" as const,
    receiptWidth: "80mm" as const, printerModel: settings.printerModel,
    printerConnection: "USB" as const, invoicePrefix: settings.invoicePrefix,
    orderPrefix: settings.orderPrefix, quotePrefix: settings.quotePrefix,
    expensePrefix: settings.expensePrefix,
  } : defaults;
  return <><PageHeading eyebrow="Administration" title="Settings" description="Business identity, receipt printing, backup, and concurrency-safe document numbering configuration." /><div className="max-w-5xl space-y-6"><Card className="p-6 sm:p-8"><SettingsForm values={values} editable={hasPermission(user.role, "settings:manage")} /></Card><Card className="p-6 sm:p-8"><h2 className="text-xl font-black text-slate-950">Receipt printing</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><PrintInfo label="Method" value="Browser Print" /><PrintInfo label="Receipt size" value="80mm" /></dl><p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">Select the XP-80T/XP-80C Windows printer in the browser print dialog. Printer availability, paper feed, and cutter behavior are controlled by Windows and the installed printer driver.</p></Card>{canManageBackups ? <Card className="p-6 sm:p-8"><div className="mb-6"><h2 className="text-xl font-black text-slate-950">Backup & restore</h2><p className="mt-1 text-sm text-slate-500">Admin-only portable backups with validation before any database write.</p></div><BackupRestorePanel applicationVersion={APPLICATION_VERSION} schemaVersion={SCHEMA_VERSION} lastBackup={lastBackup ? { createdAtLabel: shopDateTime.format(lastBackup.createdAt), userName: lastBackup.user?.name ?? null } : null}/></Card> : null}</div></>;
}

function PrintInfo({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-black text-slate-950">{value}</dd></div>; }
