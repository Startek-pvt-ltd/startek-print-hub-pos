CREATE TYPE "InvoiceStatus" AS ENUM ('FINALIZED', 'VOID');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'QR');

CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "customerId" TEXT,
  "customerNameSnapshot" TEXT,
  "customerPhoneSnapshot" TEXT,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(18,2) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'FINALIZED',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "voidedById" TEXT,
  "voidReason" TEXT,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_financial_values_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal" AND "grandTotal" = "subtotal" - "discount"),
  CONSTRAINT "invoices_void_state_check" CHECK (("status" = 'FINALIZED' AND "voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL) OR ("status" = 'VOID' AND "voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND length(trim("voidReason")) > 0))
);

CREATE TABLE "invoice_items" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_items_values_check" CHECK (length(trim("description")) > 0 AND "quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "payment_reversals" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "reversedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_reversals_reason_check" CHECK (length(trim("reason")) > 0)
);

CREATE UNIQUE INDEX "customers_phoneNumber_key" ON "customers"("phoneNumber");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_idempotencyKey_key" ON "invoices"("idempotencyKey");
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");
CREATE INDEX "invoices_status_createdAt_idx" ON "invoices"("status", "createdAt");
CREATE INDEX "invoices_customerNameSnapshot_idx" ON "invoices"("customerNameSnapshot");
CREATE INDEX "invoices_customerPhoneSnapshot_idx" ON "invoices"("customerPhoneSnapshot");
CREATE UNIQUE INDEX "invoice_items_invoiceId_sortOrder_key" ON "invoice_items"("invoiceId", "sortOrder");
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");
CREATE INDEX "payments_invoiceId_createdAt_idx" ON "payments"("invoiceId", "createdAt");
CREATE INDEX "payments_method_createdAt_idx" ON "payments"("method", "createdAt");
CREATE UNIQUE INDEX "payment_reversals_paymentId_key" ON "payment_reversals"("paymentId");
CREATE INDEX "payment_reversals_reversedById_createdAt_idx" ON "payment_reversals"("reversedById", "createdAt");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
