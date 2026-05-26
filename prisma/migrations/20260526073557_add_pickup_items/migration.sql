-- AlterTable
ALTER TABLE `product` MODIFY `imageUrl` VARCHAR(191) NULL,
    MODIFY `metaDescription` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `productvariant` MODIFY `imageUrl` VARCHAR(191) NULL,
    MODIFY `metaDescription` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `store` MODIFY `wooConsumerKey` VARCHAR(191) NULL,
    MODIFY `wooConsumerSecret` VARCHAR(191) NULL,
    MODIFY `wooWebhookSecret` VARCHAR(191) NULL;
