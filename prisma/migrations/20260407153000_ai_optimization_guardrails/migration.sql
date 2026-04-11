ALTER TABLE `Post`
    ADD COLUMN `canonicalContentHash` VARCHAR(64) NULL;

ALTER TABLE `ArticleMatch`
    ADD COLUMN `optimizationCacheId` VARCHAR(191) NULL,
    ADD COLUMN `workflowStage` ENUM('INGESTED', 'OPTIMIZED', 'HELD', 'REVIEW_REQUIRED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'INGESTED',
    ADD COLUMN `optimizationStatus` ENUM('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FALLBACK', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'NOT_REQUESTED',
    ADD COLUMN `policyStatus` ENUM('PASS', 'HOLD', 'BLOCK') NOT NULL DEFAULT 'PASS',
    ADD COLUMN `optimizationHash` VARCHAR(64) NULL,
    ADD COLUMN `optimizedPayloadJson` JSON NULL,
    ADD COLUMN `policyReasonsJson` JSON NULL,
    ADD COLUMN `readinessChecksJson` JSON NULL,
    ADD COLUMN `banRiskScore` INTEGER NULL,
    ADD COLUMN `lastOptimizedAt` DATETIME(3) NULL,
    ADD COLUMN `lastPolicyCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewNotes` LONGTEXT NULL;

CREATE TABLE `OptimizationCache` (
    `id` VARCHAR(191) NOT NULL,
    `cacheKey` VARCHAR(191) NOT NULL,
    `contentHash` VARCHAR(64) NOT NULL,
    `settingsHash` VARCHAR(64) NOT NULL,
    `optimizationHash` VARCHAR(64) NOT NULL,
    `locale` VARCHAR(16) NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `destinationKind` ENUM('WEBSITE', 'FACEBOOK_PROFILE', 'FACEBOOK_PAGE', 'INSTAGRAM_PERSONAL', 'INSTAGRAM_BUSINESS') NOT NULL,
    `status` ENUM('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FALLBACK', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `policyStatus` ENUM('PASS', 'HOLD', 'BLOCK') NOT NULL DEFAULT 'PASS',
    `provider` VARCHAR(64) NULL,
    `model` VARCHAR(128) NULL,
    `usedFallback` BOOLEAN NOT NULL DEFAULT false,
    `banRiskScore` INTEGER NULL,
    `resultJson` JSON NULL,
    `warningsJson` JSON NULL,
    `errorMessage` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `OptimizationCache_cacheKey_key`(`cacheKey`),
    INDEX `OptimizationCache_platform_destinationKind_locale_idx`(`platform`, `destinationKind`, `locale`),
    INDEX `OptimizationCache_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PublishAttempt`
    ADD COLUMN `diagnosticsJson` JSON NULL,
    ADD COLUMN `errorCode` VARCHAR(128) NULL,
    ADD COLUMN `retryable` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `FetchRun`
    ADD COLUMN `optimizedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `blockedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `aiCacheHitCount` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `ArticleMatch_streamId_workflowStage_idx` ON `ArticleMatch`(`streamId`, `workflowStage`);
CREATE INDEX `ArticleMatch_destinationId_policyStatus_idx` ON `ArticleMatch`(`destinationId`, `policyStatus`);

ALTER TABLE `OptimizationCache`
    ADD CONSTRAINT `OptimizationCache_locale_fkey`
    FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ArticleMatch`
    ADD CONSTRAINT `ArticleMatch_optimizationCacheId_fkey`
    FOREIGN KEY (`optimizationCacheId`) REFERENCES `OptimizationCache`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
