-- PostgreSQL CHECK accepts NULL; require an explicit non-null reason for VOID.
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_void_state_check";
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_void_state_check" CHECK (
  ("status" = 'FINALIZED' AND "voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL)
  OR
  ("status" = 'VOID' AND "voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND "voidReason" IS NOT NULL AND length(trim("voidReason")) > 0)
);
