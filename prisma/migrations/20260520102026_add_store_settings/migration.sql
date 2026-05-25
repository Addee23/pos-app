-- AlterTable
ALTER TABLE `store` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `receiptFooter` VARCHAR(191) NULL,
    ADD COLUMN `receiptWidthMm` INTEGER NOT NULL DEFAULT 80,
    ADD COLUMN `returnText` VARCHAR(191) NULL,
    ADD COLUMN `socialLinks` VARCHAR(191) NULL,
    ADD COLUMN `thankYouMessage` VARCHAR(191) NULL;
