-- V1.0.1 adds a normalized username login and the owner-facing STAFF role.
-- Legacy role enum values remain available so historical accounts and audit
-- relationships are preserved without a destructive enum rewrite.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF' AFTER 'ADMIN';

ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- The documented V1 Production database has one controlled active ADMIN.
-- Preserve that row and every relation while assigning the owner-approved
-- login. Other existing identities receive stable collision-safe compatibility
-- usernames that an ADMIN may later replace through Staff Management.
WITH primary_admin AS (
  SELECT "id"
  FROM "users"
  WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE'
  ORDER BY "createdAt", "id"
  LIMIT 1
)
UPDATE "users"
SET "username" = CASE
  WHEN "id" = (SELECT "id" FROM primary_admin) THEN 'stadmin'
  ELSE 'legacy_' || substr(md5("id"), 1, 16)
END;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

ALTER TABLE "users" ADD CONSTRAINT "users_username_normalized_check" CHECK (
  "username" = lower(trim("username"))
  AND length("username") BETWEEN 3 AND 32
  AND "username" ~ '^[a-z0-9][a-z0-9._-]*$'
);
