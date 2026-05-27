-- AlterTable
ALTER TABLE `Store`
    ADD COLUMN `smtpHost` VARCHAR(191) NULL,
    ADD COLUMN `smtpPort` INTEGER NULL,
    ADD COLUMN `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smtpUser` TEXT NULL,
    ADD COLUMN `smtpPass` TEXT NULL,
    ADD COLUMN `smtpFrom` VARCHAR(191) NULL;
