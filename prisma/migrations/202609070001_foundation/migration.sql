CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'DESIGNER', 'PRODUCTION');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "businessName" TEXT NOT NULL DEFAULT 'Startek Print Hub',
    "address" TEXT NOT NULL DEFAULT 'No.62 Padukka Road, Meegoda, Sri Lanka',
    "phonePrimary" TEXT NOT NULL DEFAULT '0705935320',
    "phoneSecond" TEXT NOT NULL DEFAULT '0777250493',
    "email" TEXT NOT NULL DEFAULT 'startekprinthub@gmail.com',
    "currencyCode" TEXT NOT NULL DEFAULT 'LKR',
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
    "receiptFooter" TEXT NOT NULL DEFAULT 'Design & Deploy by Startek (PVT) LTD',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'SPH-INV',
    "orderPrefix" TEXT NOT NULL DEFAULT 'SPH-ORD',
    "quotePrefix" TEXT NOT NULL DEFAULT 'SPH-QT',
    "expensePrefix" TEXT NOT NULL DEFAULT 'SPH-EXP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "number_counters" (
    "key" TEXT NOT NULL,
    "nextValue" BIGINT NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "number_counters_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
