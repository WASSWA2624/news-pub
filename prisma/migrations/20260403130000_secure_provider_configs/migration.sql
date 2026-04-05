-- AlterTable
ALTER TABLE `ModelProviderConfig`
    ADD COLUMN `apiKeyEncrypted` LONGTEXT NULL,
    ADD COLUMN `apiKeyLast4` VARCHAR(8) NULL,
    ADD COLUMN `apiKeyUpdatedAt` DATETIME(3) NULL;
