CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'DESIGNING', 'WAITING_APPROVAL', 'APPROVED', 'PRINTING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED');

ALTER TABLE "invoices" ADD COLUMN "orderId" TEXT;

CREATE TABLE "quotations" (
  "id" TEXT NOT NULL,
  "quotationNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "customerId" TEXT,
  "customerNameSnapshot" TEXT NOT NULL,
  "customerPhoneSnapshot" TEXT NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(18,2) NOT NULL,
  "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "validUntil" DATE,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "convertedAt" TIMESTAMP(3),
  "convertedById" TEXT,
  CONSTRAINT "quotations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotations_financial_values_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal" AND "grandTotal" = "subtotal" - "discount"),
  CONSTRAINT "quotations_customer_snapshot_check" CHECK (length(trim("customerNameSnapshot")) > 0 AND length(trim("customerPhoneSnapshot")) > 0),
  CONSTRAINT "quotations_conversion_state_check" CHECK (("status" = 'CONVERTED' AND "convertedAt" IS NOT NULL AND "convertedById" IS NOT NULL) OR ("status" <> 'CONVERTED' AND "convertedAt" IS NULL AND "convertedById" IS NULL))
);

CREATE TABLE "quotation_items" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotation_items_values_check" CHECK (length(trim("description")) > 0 AND "quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "quotation_status_history" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "previousStatus" "QuotationStatus",
  "newStatus" "QuotationStatus" NOT NULL,
  "note" TEXT,
  "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "quotationId" TEXT,
  "customerId" TEXT,
  "customerNameSnapshot" TEXT NOT NULL,
  "customerPhoneSnapshot" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "jobName" TEXT,
  "dueDate" DATE,
  "assignedStaffId" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_customer_snapshot_check" CHECK (length(trim("customerNameSnapshot")) > 0 AND length(trim("customerPhoneSnapshot")) > 0)
);

CREATE TABLE "order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "lineTotal" DECIMAL(18,2) NOT NULL,
  "size" TEXT,
  "material" TEXT,
  "finishing" TEXT,
  "designInstructions" TEXT,
  "additionalNotes" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_values_check" CHECK (length(trim("description")) > 0 AND "quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0)
);

CREATE TABLE "order_status_history" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "previousStatus" "OrderStatus",
  "newStatus" "OrderStatus" NOT NULL,
  "note" TEXT,
  "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");
CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON "quotations"("quotationNumber");
CREATE UNIQUE INDEX "quotations_idempotencyKey_key" ON "quotations"("idempotencyKey");
CREATE INDEX "quotations_customerId_idx" ON "quotations"("customerId");
CREATE INDEX "quotations_status_createdAt_idx" ON "quotations"("status", "createdAt");
CREATE INDEX "quotations_customerNameSnapshot_idx" ON "quotations"("customerNameSnapshot");
CREATE INDEX "quotations_customerPhoneSnapshot_idx" ON "quotations"("customerPhoneSnapshot");
CREATE UNIQUE INDEX "quotation_items_quotationId_sortOrder_key" ON "quotation_items"("quotationId", "sortOrder");
CREATE INDEX "quotation_items_quotationId_idx" ON "quotation_items"("quotationId");
CREATE INDEX "quotation_status_history_quotationId_createdAt_idx" ON "quotation_status_history"("quotationId", "createdAt");
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE UNIQUE INDEX "orders_quotationId_key" ON "orders"("quotationId");
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");
CREATE INDEX "orders_status_dueDate_idx" ON "orders"("status", "dueDate");
CREATE INDEX "orders_assignedStaffId_status_idx" ON "orders"("assignedStaffId", "status");
CREATE INDEX "orders_customerNameSnapshot_idx" ON "orders"("customerNameSnapshot");
CREATE INDEX "orders_customerPhoneSnapshot_idx" ON "orders"("customerPhoneSnapshot");
CREATE UNIQUE INDEX "order_items_orderId_sortOrder_key" ON "order_items"("orderId", "sortOrder");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_convertedById_fkey" FOREIGN KEY ("convertedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
