-- AlterTable
ALTER TABLE `Pickup` ADD COLUMN `packedAt` DATETIME(3) NULL,
    ADD COLUMN `packedById` VARCHAR(191) NULL;

-- AlterTable: add AWAITING_PACK and change default
ALTER TABLE `Pickup` MODIFY `status` ENUM('AWAITING_PACK', 'READY', 'PICKED_UP', 'CANCELLED') NOT NULL DEFAULT 'AWAITING_PACK';

-- Existing READY orders without confirmation mail should wait for packing again
UPDATE `Pickup`
SET `status` = 'AWAITING_PACK'
WHERE `status` = 'READY' AND `readyEmailSentAt` IS NULL;

-- AddForeignKey
ALTER TABLE `Pickup` ADD CONSTRAINT `Pickup_packedById_fkey` FOREIGN KEY (`packedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
