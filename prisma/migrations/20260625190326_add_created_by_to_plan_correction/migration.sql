-- AlterTable
ALTER TABLE "plans_correction" ADD COLUMN     "createdBy" UUID;

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
