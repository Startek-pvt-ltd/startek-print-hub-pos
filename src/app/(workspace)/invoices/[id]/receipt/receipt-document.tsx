import { ReceiptLogo } from "./receipt-logo";
import type { ReceiptViewModel } from "@/server/receipt-service";

export function ReceiptDocument({ receipt }: { receipt: ReceiptViewModel }) {
  return (
    <article className="bg-white p-[4mm] pb-[8mm] text-[11px] leading-[1.35] text-black shadow-sm print:shadow-none" style={{ fontFamily: "Arial, Helvetica, system-ui, sans-serif" }}>
      <header className="text-center"><ReceiptLogo /><p>{receipt.business.address}</p><p>{receipt.business.phonePrimary} / {receipt.business.phoneSecond}</p><p>{receipt.business.email}</p>{receipt.reprint ? <p className="my-2 border-y-2 border-black py-1.5 text-base font-black">REPRINT</p> : null}{receipt.status === "VOID" ? <p className="my-2 border-y-2 border-black py-1.5 text-base font-black">VOID</p> : null}</header>
      <div className="my-2 border-y border-dashed border-black py-1.5"><p><b>INVOICE:</b> {receipt.invoiceNumber}</p><p><b>DATE:</b> {formatDate(receipt.createdAt)}</p><p><b>CASHIER:</b> {receipt.cashier}</p>{receipt.order ? <p><b>ORDER:</b> {receipt.order.orderNumber}</p> : null}</div>
      <div className="mb-2"><p className="font-black">CUSTOMER</p><p>{receipt.customerName ?? "Walk-in"}</p>{receipt.customerPhone ? <p>{receipt.customerPhone}</p> : null}</div>
      <table className="w-full table-fixed"><thead><tr className="border-b border-black text-left"><th className="w-[58%] py-1">ITEM</th><th className="w-[14%] text-center">QTY</th><th className="w-[28%] text-right">AMOUNT</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr className="align-top" key={`${item.description}-${index}`}><td className="break-words py-1 pr-1">{item.description}<br /><span className="text-[9px]">{item.quantity} × Rs. {item.unitPrice}</span></td><td className="py-1 text-center">{item.quantity}</td><td className="py-1 text-right">{item.amount}</td></tr>)}</tbody></table>
      <div className="mt-1 border-y border-dashed border-black py-1.5"><Row label="SUBTOTAL" value={receipt.subtotal} /><Row label="DISCOUNT" value={receipt.discount} /><div className="my-1 border-t border-black pt-1"><Row label="TOTAL" value={receipt.total} strong /></div><Row label="PAID" value={receipt.paid} /><Row label="BALANCE" value={receipt.outstanding} strong /></div>
      <div className="py-1.5"><p className="font-bold">PAYMENTS</p>{receipt.payments.length ? receipt.payments.map((payment, index) => <div key={index}><p>{payment.method.replace("_", " ")} — Rs. {payment.amount}{payment.reversed ? " (REVERSED)" : ""}</p>{!payment.reversed && payment.cashTendered ? <><Row label="CASH TENDERED" value={payment.cashTendered} /><Row label="CHANGE" value={payment.changeGiven ?? "0.00"} /></> : null}</div>) : <p>No payment</p>}</div>
      <footer className="mt-1 border-t border-dashed border-black pt-2 text-center"><p className="font-black">{receipt.footer}</p><p>{receipt.business.businessName}</p><p className="mt-1">{receipt.business.receiptFooter}</p></footer>
    </article>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <p className={`flex justify-between ${strong ? "font-black" : ""}`}><span>{label}</span><span>Rs. {value}</span></p>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value)); }
