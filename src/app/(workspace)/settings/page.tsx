import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { SettingsForm } from "./settings-form";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

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

export default async function SettingsPage() {
  const user = await requirePermission("settings:view");
  const settings = await db.setting.findUnique({ where: { id: "primary" } });
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
  return <><PageHeading eyebrow="Administration" title="Settings" description="Business identity, receipt-printer defaults, and concurrency-safe document numbering configuration." /><Card className="max-w-4xl p-6 sm:p-8"><SettingsForm values={values} editable={hasPermission(user.role, "settings:manage")} /></Card></>;
}
