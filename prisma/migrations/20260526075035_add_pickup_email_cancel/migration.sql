-- AlterTable
ALTER TABLE `pickup` ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `cancelledById` VARCHAR(191) NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `readyEmailSentAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Pickup_customerEmail_idx` ON `Pickup`(`customerEmail`);

-- CreateIndex
CREATE INDEX `Pickup_cancelledById_idx` ON `Pickup`(`cancelledById`);

-- AddForeignKey
ALTER TABLE `Pickup` ADD CONSTRAINT `Pickup_cancelledById_fkey` FOREIGN KEY (`cancelledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
