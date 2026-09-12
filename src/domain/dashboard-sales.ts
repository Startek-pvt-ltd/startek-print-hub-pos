export function invoicesVisibleAfterReset<T extends { createdAt: Date }>(invoices: readonly T[], resetAt: Date | null) {
  return resetAt ? invoices.filter((invoice) => invoice.createdAt > resetAt) : [...invoices];
}
