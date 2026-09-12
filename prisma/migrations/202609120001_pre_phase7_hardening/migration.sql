-- Persist retail cash tender/change without changing the authoritative applied
-- Payment amount. Existing historical CASH payments remain valid with both
-- nullable values absent.
ALTER TABLE "payments"
  ADD COLUMN "cashTendered" DECIMAL(18,2),
  ADD COLUMN "changeGiven" DECIMAL(18,2);

ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_tender_check" CHECK (
  (
    "method" = 'CASH'
    AND (
      ("cashTendered" IS NULL AND "changeGiven" IS NULL)
      OR (
        "cashTendered" IS NOT NULL
        AND "changeGiven" IS NOT NULL
        AND "cashTendered" >= "amount"
        AND "changeGiven" = "cashTendered" - "amount"
      )
    )
  )
  OR (
    "method" <> 'CASH'
    AND "cashTendered" IS NULL
    AND "changeGiven" IS NULL
  )
);

-- Dashboard-only operational reset markers. These never modify invoices,
-- payments, reports, or other financial history.
CREATE TABLE "dashboard_sales_resets" (
  "id" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_sales_resets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dashboard_sales_resets_businessDate_resetAt_idx"
  ON "dashboard_sales_resets"("businessDate", "resetAt");
CREATE INDEX "dashboard_sales_resets_createdById_createdAt_idx"
  ON "dashboard_sales_resets"("createdById", "createdAt");

ALTER TABLE "dashboard_sales_resets"
  ADD CONSTRAINT "dashboard_sales_resets_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
