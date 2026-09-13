import { formatMoney, calculateOutstanding, calculateValidPaidTotal } from "@/domain/financial";
import type { getInvoiceById } from "@/server/invoice-service";

type PersistedInvoice = NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>;

export function buildReceiptViewModel(invoice: PersistedInvoice, settings: { businessName: string; address: string; phonePrimary: string; phoneSecond: string; email: string; receiptFooter: string }, reprint = false) {
  const ledger = invoice.payments.map((payment) => ({ amount: payment.amount.toString(), reversed: Boolean(payment.reversal) }));
  const paid = calculateValidPaidTotal(ledger);
  return {
    reprint,
    business: settings,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt.toISOString(),
    cashier: invoice.createdBy.name,
    customerName: invoice.customerNameSnapshot,
    customerPhone: invoice.customerPhoneSnapshot,
    status: invoice.status,
    items: invoice.items.map((item) => ({ description: item.description, quantity: item.quantity.toString(), unitPrice: formatMoney(item.unitPrice.toString()), amount: formatMoney(item.lineTotal.toString()) })),
    subtotal: formatMoney(invoice.subtotal.toString()),
    discount: formatMoney(invoice.discount.toString()),
    total: formatMoney(invoice.grandTotal.toString()),
    paid: formatMoney(paid),
    outstanding: formatMoney(calculateOutstanding(invoice.grandTotal.toString(), ledger)),
    payments: invoice.payments.map((payment) => ({
      method: payment.method,
      amount: formatMoney(payment.amount.toString()),
      cashTendered: payment.cashTendered ? formatMoney(payment.cashTendered.toString()) : null,
      changeGiven: payment.changeGiven ? formatMoney(payment.changeGiven.toString()) : null,
      reference: payment.reference,
      reversed: Boolean(payment.reversal),
    })),
    order: invoice.order ? { orderNumber: invoice.order.orderNumber, jobName: invoice.order.jobName, dueDate: invoice.order.dueDate?.toISOString().slice(0, 10) ?? null } : null,
    footer: "Thank You",
  };
}

export type ReceiptViewModel = ReturnType<typeof buildReceiptViewModel>;
