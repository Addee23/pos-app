-- CreateTable
CREATE TABLE `Pickup` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `pickupCode` VARCHAR(191) NOT NULL,
    `status` ENUM('READY', 'PICKED_UP', 'CANCELLED') NOT NULL DEFAULT 'READY',
    `notes` VARCHAR(191) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `pickedUpById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Pickup_storeId_status_idx`(`storeId`, `status`),
    INDEX `Pickup_customerName_idx`(`customerName`),
    UNIQUE INDEX `Pickup_storeId_pickupCode_key`(`storeId`, `pickupCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pickup` ADD CONSTRAINT `Pickup_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pickup` ADD CONSTRAINT `Pickup_pickedUpById_fkey` FOREIGN KEY (`pickedUpById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
