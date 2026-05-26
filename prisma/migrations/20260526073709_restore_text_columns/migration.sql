-- AlterTable
ALTER TABLE `product` MODIFY `imageUrl` TEXT NULL,
    MODIFY `metaDescription` TEXT NULL;

-- AlterTable
ALTER TABLE `productvariant` MODIFY `imageUrl` TEXT NULL,
    MODIFY `metaDescription` TEXT NULL;

-- AlterTable
ALTER TABLE `store` MODIFY `wooConsumerKey` TEXT NULL,
    MODIFY `wooConsumerSecret` TEXT NULL,
    MODIFY `wooWebhookSecret` TEXT NULL;
