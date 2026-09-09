-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MATERIALS', 'ELECTRICITY', 'SALARY', 'TRANSPORT', 'MAINTENANCE', 'RENT', 'PETTY_CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('FINALIZED', 'VOID');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_DEPOSIT', 'CASH_WITHDRAWAL');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cashSessionId" TEXT;

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'FINALIZED',
    "createdById" TEXT NOT NULL,
    "cashSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "closeIdempotencyKey" TEXT,
    "openGuard" TEXT,
    "openingCash" DECIMAL(18,2) NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "expectedCash" DECIMAL(18,2),
    "actualCash" DECIMAL(18,2),
    "difference" DECIMAL(18,2),
    "closingNote" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_idempotencyKey_key" ON "expenses"("idempotencyKey");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "expenses_category_expenseDate_idx" ON "expenses"("category", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_paymentMethod_expenseDate_idx" ON "expenses"("paymentMethod", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_status_expenseDate_idx" ON "expenses"("status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_createdById_expenseDate_idx" ON "expenses"("createdById", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_cashSessionId_expenseDate_idx" ON "expenses"("cashSessionId", "expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_idempotencyKey_key" ON "cash_sessions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_closeIdempotencyKey_key" ON "cash_sessions"("closeIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_openGuard_key" ON "cash_sessions"("openGuard");

-- CreateIndex
CREATE INDEX "cash_sessions_status_openedAt_idx" ON "cash_sessions"("status", "openedAt");

-- CreateIndex
CREATE INDEX "cash_sessions_openedById_openedAt_idx" ON "cash_sessions"("openedById", "openedAt");

-- CreateIndex
CREATE INDEX "cash_sessions_closedById_closedAt_idx" ON "cash_sessions"("closedById", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_idempotencyKey_key" ON "cash_movements"("idempotencyKey");

-- CreateIndex
CREATE INDEX "cash_movements_cashSessionId_createdAt_idx" ON "cash_movements"("cashSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_movements_createdById_createdAt_idx" ON "cash_movements"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "payments_cashSessionId_createdAt_idx" ON "payments"("cashSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 5 financial and lifecycle invariants.
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_session_method_check" CHECK (
  "method" = 'CASH' OR "cashSessionId" IS NULL
);

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_values_check" CHECK (
  "amount" > 0 AND length(trim("description")) > 0
);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_session_method_check" CHECK (
  ("paymentMethod" = 'CASH' AND "cashSessionId" IS NOT NULL)
  OR ("paymentMethod" <> 'CASH' AND "cashSessionId" IS NULL)
);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_void_state_check" CHECK (
  ("status" = 'FINALIZED' AND "voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL)
  OR
  ("status" = 'VOID' AND "voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND "voidReason" IS NOT NULL AND length(trim("voidReason")) > 0)
);

ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_state_check" CHECK (
  "openingCash" >= 0
  AND (
    ("status" = 'OPEN' AND "openGuard" = 'PRIMARY' AND "closedAt" IS NULL AND "closedById" IS NULL AND "expectedCash" IS NULL AND "actualCash" IS NULL AND "difference" IS NULL AND "closeIdempotencyKey" IS NULL)
    OR
    ("status" = 'CLOSED' AND "openGuard" IS NULL AND "closedAt" IS NOT NULL AND "closedById" IS NOT NULL AND "expectedCash" IS NOT NULL AND "actualCash" IS NOT NULL AND "actualCash" >= 0 AND "difference" = "actualCash" - "expectedCash" AND "closeIdempotencyKey" IS NOT NULL)
  )
);

ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_values_check" CHECK (
  "amount" > 0 AND length(trim("reason")) > 0
);

-- Lock the referenced drawer row while adding activity. This serializes activity
-- against closing and rejects any late write after the session becomes CLOSED.
CREATE FUNCTION require_open_cash_session() RETURNS trigger AS $$
BEGIN
  IF NEW."cashSessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "cash_sessions"
    WHERE "id" = NEW."cashSessionId" AND "status" = 'OPEN'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'cash session is not open' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_require_open_cash_session
  BEFORE INSERT OR UPDATE OF "cashSessionId" ON "payments"
  FOR EACH ROW EXECUTE FUNCTION require_open_cash_session();
CREATE TRIGGER expenses_require_open_cash_session
  BEFORE INSERT OR UPDATE OF "cashSessionId" ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION require_open_cash_session();
CREATE TRIGGER cash_movements_require_open_cash_session
  BEFORE INSERT OR UPDATE OF "cashSessionId" ON "cash_movements"
  FOR EACH ROW EXECUTE FUNCTION require_open_cash_session();

-- A reversal changes valid drawer receipts, so it must occur before that drawer
-- is closed. Legacy payments without a session retain the accepted Phase 3 rule.
CREATE FUNCTION require_open_session_for_reversal() RETURNS trigger AS $$
DECLARE
  session_id TEXT;
BEGIN
  SELECT "cashSessionId" INTO session_id FROM "payments" WHERE "id" = NEW."paymentId";
  IF session_id IS NOT NULL THEN
    PERFORM 1 FROM "cash_sessions" WHERE "id" = session_id AND "status" = 'OPEN' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cash payment belongs to a closed session' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_reversals_require_open_session
  BEFORE INSERT ON "payment_reversals"
  FOR EACH ROW EXECUTE FUNCTION require_open_session_for_reversal();

-- Expense snapshots may only transition once from FINALIZED to VOID. Core data
-- and all retained expense rows are immutable.
CREATE FUNCTION protect_expense_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'expenses cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'VOID' OR
     NEW."expenseNumber" <> OLD."expenseNumber" OR
     NEW."idempotencyKey" <> OLD."idempotencyKey" OR
     NEW."expenseDate" <> OLD."expenseDate" OR
     NEW."category" <> OLD."category" OR
     NEW."description" <> OLD."description" OR
     NEW."amount" <> OLD."amount" OR
     NEW."paymentMethod" <> OLD."paymentMethod" OR
     NEW."createdById" <> OLD."createdById" OR
     NEW."cashSessionId" IS DISTINCT FROM OLD."cashSessionId" OR
     NEW."createdAt" <> OLD."createdAt" OR
     NEW."status" <> 'VOID' THEN
    RAISE EXCEPTION 'expense history is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_protect_history
  BEFORE UPDATE OR DELETE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION protect_expense_history();

-- Once closed, a cash session is terminal and cannot be edited or deleted.
CREATE FUNCTION protect_closed_cash_session() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'cash sessions cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'closed cash sessions are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cash_sessions_protect_closed
  BEFORE UPDATE OR DELETE ON "cash_sessions"
  FOR EACH ROW EXECUTE FUNCTION protect_closed_cash_session();
