-- Establish a non-destructive operational archive boundary. Historical
-- business and financial records remain retained and directly auditable.
ALTER TABLE "settings"
  ADD COLUMN "operationalDataStartAt" TIMESTAMP(3);
