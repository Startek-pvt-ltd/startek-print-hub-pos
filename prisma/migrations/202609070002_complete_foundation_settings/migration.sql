ALTER TABLE "settings"
  ALTER COLUMN "address" SET DEFAULT 'No.62 Padukka Road, Meegoda',
  ADD COLUMN "displayCurrency" TEXT NOT NULL DEFAULT 'Rs.',
  ADD COLUMN "receiptWidth" TEXT NOT NULL DEFAULT '80mm',
  ADD COLUMN "printerModel" TEXT NOT NULL DEFAULT 'Xprinter XP-80T',
  ADD COLUMN "printerConnection" TEXT NOT NULL DEFAULT 'USB';

UPDATE "settings"
SET "address" = 'No.62 Padukka Road, Meegoda'
WHERE "address" = 'No.62 Padukka Road, Meegoda, Sri Lanka';
