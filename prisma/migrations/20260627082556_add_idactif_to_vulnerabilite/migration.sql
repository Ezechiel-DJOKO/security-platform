-- AlterTable
ALTER TABLE "vulnerabilites" ADD COLUMN     "idActif" UUID;

-- AddForeignKey
ALTER TABLE "vulnerabilites" ADD CONSTRAINT "vulnerabilites_idActif_fkey" FOREIGN KEY ("idActif") REFERENCES "actifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
