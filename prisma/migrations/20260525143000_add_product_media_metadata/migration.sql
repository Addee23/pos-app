ALTER TABLE `Product`
  ADD COLUMN `imageUrl` TEXT NULL,
  ADD COLUMN `metaDescription` TEXT NULL;

ALTER TABLE `ProductVariant`
  ADD COLUMN `imageUrl` TEXT NULL,
  ADD COLUMN `metaDescription` TEXT NULL;
