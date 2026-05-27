CREATE TABLE `PickupItem` (
  `id` VARCHAR(191) NOT NULL,
  `pickupId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `variantId` VARCHAR(191) NULL,
  `productName` VARCHAR(191) NOT NULL,
  `variantName` VARCHAR(191) NULL,
  `productSlug` VARCHAR(191) NULL,
  `productImageUrl` TEXT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PickupItem_pickupId_idx`(`pickupId`),
  INDEX `PickupItem_productId_idx`(`productId`),
  INDEX `PickupItem_variantId_idx`(`variantId`),
  INDEX `PickupItem_productSlug_idx`(`productSlug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PickupItem`
  ADD CONSTRAINT `PickupItem_pickupId_fkey`
  FOREIGN KEY (`pickupId`) REFERENCES `Pickup`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PickupItem`
  ADD CONSTRAINT `PickupItem_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PickupItem`
  ADD CONSTRAINT `PickupItem_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
