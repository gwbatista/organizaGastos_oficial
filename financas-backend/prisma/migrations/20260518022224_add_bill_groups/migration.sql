-- AlterTable
ALTER TABLE "public"."Bill" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "installmentTotal" INTEGER,
ADD COLUMN     "recurrenceType" TEXT NOT NULL DEFAULT 'single';

-- CreateIndex
CREATE INDEX "Bill_groupId_idx" ON "public"."Bill"("groupId");

-- CreateIndex
CREATE INDEX "Bill_month_year_idx" ON "public"."Bill"("month", "year");
