ALTER TABLE `MediaAsset`
    ADD COLUMN `fileName` VARCHAR(255) NULL,
    ADD COLUMN `fileSizeBytes` INTEGER NULL;

CREATE TABLE `MediaVariant` (
    `id` VARCHAR(191) NOT NULL,
    `mediaAssetId` VARCHAR(191) NOT NULL,
    `variantKey` VARCHAR(64) NOT NULL,
    `format` VARCHAR(32) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `fileSizeBytes` INTEGER NULL,
    `storageKey` VARCHAR(255) NULL,
    `publicUrl` VARCHAR(2048) NULL,
    `localPath` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaVariant_mediaAssetId_idx`(`mediaAssetId`),
    INDEX `MediaVariant_mediaAssetId_variantKey_idx`(`mediaAssetId`, `variantKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MediaVariant`
    ADD CONSTRAINT `MediaVariant_mediaAssetId_fkey`
    FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
