-- AlterTable
ALTER TABLE `Product` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `brand` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Product_storeId_category_idx` ON `Product`(`storeId`, `category`);
CREATE INDEX `Product_storeId_brand_idx` ON `Product`(`storeId`, `brand`);
CREATE INDEX `Product_storeId_country_idx` ON `Product`(`storeId`, `country`);
