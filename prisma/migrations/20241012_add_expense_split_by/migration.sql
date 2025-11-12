-- Adds the splitBy column so we can persist per-expense split metadata
ALTER TABLE "Expense"
    ADD COLUMN IF NOT EXISTS "splitBy" INTEGER DEFAULT 1;

UPDATE "Expense"
SET "splitBy" = 1
WHERE "splitBy" IS NULL;
