-- CreateTable
CREATE TABLE `Locale` (
    `code` VARCHAR(16) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'EDITOR') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `invalidatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userAgent` VARCHAR(512) NULL,

    UNIQUE INDEX `AdminSession_tokenHash_key`(`tokenHash`),
    INDEX `AdminSession_expiresAt_idx`(`expiresAt`),
    INDEX `AdminSession_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsProviderConfig` (
    `id` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(64) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `baseUrl` VARCHAR(2048) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isSelectable` BOOLEAN NOT NULL DEFAULT true,
    `requestDefaultsJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NewsProviderConfig_providerKey_key`(`providerKey`),
    INDEX `NewsProviderConfig_isEnabled_isDefault_idx`(`isEnabled`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Destination` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `kind` ENUM('WEBSITE', 'FACEBOOK_PROFILE', 'FACEBOOK_PAGE', 'INSTAGRAM_PERSONAL', 'INSTAGRAM_BUSINESS') NOT NULL,
    `accountHandle` VARCHAR(191) NULL,
    `externalAccountId` VARCHAR(191) NULL,
    `connectionStatus` ENUM('DISCONNECTED', 'CONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
    `connectionError` LONGTEXT NULL,
    `encryptedTokenCiphertext` LONGTEXT NULL,
    `encryptedTokenIv` VARCHAR(64) NULL,
    `encryptedTokenTag` VARCHAR(64) NULL,
    `tokenHint` VARCHAR(64) NULL,
    `settingsJson` JSON NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `lastConnectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Destination_slug_key`(`slug`),
    INDEX `Destination_platform_connectionStatus_idx`(`platform`, `connectionStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NULL,
    `fileSizeBytes` INTEGER NULL,
    `storageDriver` VARCHAR(32) NOT NULL,
    `storageKey` VARCHAR(255) NULL,
    `publicUrl` VARCHAR(2048) NULL,
    `localPath` VARCHAR(512) NULL,
    `sourceUrl` VARCHAR(2048) NULL,
    `sourceDomain` VARCHAR(191) NULL,
    `alt` LONGTEXT NULL,
    `caption` LONGTEXT NULL,
    `mimeType` VARCHAR(191) NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `attributionText` LONGTEXT NULL,
    `licenseType` VARCHAR(128) NULL,
    `licenseNotes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MediaAsset_sourceDomain_idx`(`sourceDomain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `FetchedArticle` (
    `id` VARCHAR(191) NOT NULL,
    `providerConfigId` VARCHAR(191) NOT NULL,
    `featuredMediaId` VARCHAR(191) NULL,
    `providerArticleId` VARCHAR(191) NULL,
    `dedupeFingerprint` VARCHAR(191) NOT NULL,
    `sourceUrlHash` VARCHAR(64) NULL,
    `normalizedTitleHash` VARCHAR(64) NOT NULL,
    `sourceName` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(2048) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` LONGTEXT NULL,
    `body` LONGTEXT NULL,
    `author` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NOT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `language` VARCHAR(32) NULL,
    `providerCategoriesJson` JSON NULL,
    `providerCountriesJson` JSON NULL,
    `providerRegionsJson` JSON NULL,
    `tagsJson` JSON NULL,
    `rawPayloadJson` JSON NULL,
    `fetchTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FetchedArticle_dedupeFingerprint_key`(`dedupeFingerprint`),
    INDEX `FetchedArticle_providerConfigId_publishedAt_idx`(`providerConfigId`, `publishedAt`),
    INDEX `FetchedArticle_sourceUrlHash_publishedAt_idx`(`sourceUrlHash`, `publishedAt`),
    INDEX `FetchedArticle_normalizedTitleHash_publishedAt_idx`(`normalizedTitleHash`, `publishedAt`),
    UNIQUE INDEX `FetchedArticle_providerConfigId_providerArticleId_key`(`providerConfigId`, `providerArticleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `sourceArticleId` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `editorialStage` ENUM('INGESTED', 'REVIEWED', 'EDITED', 'APPROVED') NOT NULL DEFAULT 'INGESTED',
    `sourceName` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(2048) NOT NULL,
    `providerKey` VARCHAR(64) NOT NULL,
    `excerpt` LONGTEXT NOT NULL,
    `featuredImageId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NULL,
    `scheduledPublishAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Post_sourceArticleId_key`(`sourceArticleId`),
    UNIQUE INDEX `Post_slug_key`(`slug`),
    INDEX `Post_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `Post_status_scheduledPublishAt_idx`(`status`, `scheduledPublishAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` LONGTEXT NOT NULL,
    `contentMd` LONGTEXT NOT NULL,
    `contentHtml` LONGTEXT NOT NULL,
    `structuredContentJson` JSON NOT NULL,
    `sourceAttribution` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PostTranslation_locale_postId_idx`(`locale`, `postId`),
    UNIQUE INDEX `PostTranslation_postId_locale_key`(`postId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderFetchCheckpoint` (
    `id` VARCHAR(191) NOT NULL,
    `streamId` VARCHAR(191) NOT NULL,
    `providerConfigId` VARCHAR(191) NOT NULL,
    `lastSuccessfulFetchAt` DATETIME(3) NULL,
    `cursorJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProviderFetchCheckpoint_streamId_providerConfigId_key`(`streamId`, `providerConfigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishingStream` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `destinationId` VARCHAR(191) NOT NULL,
    `activeProviderId` VARCHAR(191) NOT NULL,
    `defaultTemplateId` VARCHAR(191) NULL,
    `locale` VARCHAR(16) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `scheduleIntervalMinutes` INTEGER NOT NULL DEFAULT 60,
    `scheduleExpression` VARCHAR(128) NULL,
    `mode` ENUM('AUTO_PUBLISH', 'REVIEW_REQUIRED') NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `maxPostsPerRun` INTEGER NOT NULL DEFAULT 5,
    `duplicateWindowHours` INTEGER NOT NULL DEFAULT 48,
    `retryLimit` INTEGER NOT NULL DEFAULT 3,
    `retryBackoffMinutes` INTEGER NOT NULL DEFAULT 15,
    `languageAllowlistJson` JSON NULL,
    `countryAllowlistJson` JSON NULL,
    `regionAllowlistJson` JSON NULL,
    `includeKeywordsJson` JSON NULL,
    `excludeKeywordsJson` JSON NULL,
    `settingsJson` JSON NULL,
    `consecutiveFailureCount` INTEGER NOT NULL DEFAULT 0,
    `lastRunStartedAt` DATETIME(3) NULL,
    `lastRunCompletedAt` DATETIME(3) NULL,
    `lastFailureAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublishingStream_slug_key`(`slug`),
    INDEX `PublishingStream_status_destinationId_idx`(`status`, `destinationId`),
    INDEX `PublishingStream_destinationId_mode_status_idx`(`destinationId`, `mode`, `status`),
    INDEX `PublishingStream_activeProviderId_status_idx`(`activeProviderId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArticleMatch` (
    `id` VARCHAR(191) NOT NULL,
    `fetchedArticleId` VARCHAR(191) NOT NULL,
    `streamId` VARCHAR(191) NOT NULL,
    `destinationId` VARCHAR(191) NOT NULL,
    `canonicalPostId` VARCHAR(191) NULL,
    `status` ENUM('ELIGIBLE', 'HELD_FOR_REVIEW', 'QUEUED', 'PUBLISHED', 'FAILED', 'DUPLICATE', 'SKIPPED') NOT NULL,
    `filterReasonsJson` JSON NULL,
    `holdReasonsJson` JSON NULL,
    `duplicateOfMatchId` VARCHAR(191) NULL,
    `duplicateFingerprint` VARCHAR(191) NULL,
    `queuedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `overrideNotes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ArticleMatch_streamId_status_idx`(`streamId`, `status`),
    INDEX `ArticleMatch_destinationId_status_idx`(`destinationId`, `status`),
    INDEX `ArticleMatch_canonicalPostId_idx`(`canonicalPostId`),
    UNIQUE INDEX `ArticleMatch_fetchedArticleId_streamId_key`(`fetchedArticleId`, `streamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DestinationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `locale` VARCHAR(16) NULL,
    `categoryId` VARCHAR(191) NULL,
    `titleTemplate` LONGTEXT NULL,
    `summaryTemplate` LONGTEXT NULL,
    `bodyTemplate` LONGTEXT NOT NULL,
    `hashtagsTemplate` LONGTEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DestinationTemplate_platform_locale_isDefault_idx`(`platform`, `locale`, `isDefault`),
    INDEX `DestinationTemplate_platform_categoryId_idx`(`platform`, `categoryId`),
    UNIQUE INDEX `DestinationTemplate_name_platform_locale_key`(`name`, `platform`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SEORecord` (
    `id` VARCHAR(191) NOT NULL,
    `postTranslationId` VARCHAR(191) NOT NULL,
    `canonicalUrl` VARCHAR(2048) NOT NULL,
    `metaTitle` VARCHAR(255) NOT NULL,
    `metaDescription` LONGTEXT NOT NULL,
    `ogTitle` VARCHAR(255) NOT NULL,
    `ogDescription` LONGTEXT NOT NULL,
    `ogImageId` VARCHAR(191) NULL,
    `twitterTitle` VARCHAR(255) NOT NULL,
    `twitterDescription` LONGTEXT NOT NULL,
    `keywordsJson` JSON NOT NULL,
    `authorsJson` JSON NOT NULL,
    `noindex` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SEORecord_postTranslationId_key`(`postTranslationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ViewEvent` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `path` VARCHAR(2048) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `eventType` ENUM('WEBSITE_VIEW', 'PAGE_VIEW', 'POST_VIEW', 'SEARCH_VIEW') NOT NULL,
    `ipHash` VARCHAR(255) NOT NULL,
    `userAgent` VARCHAR(512) NULL,
    `referrer` VARCHAR(2048) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ViewEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
    INDEX `ViewEvent_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `payloadJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostCategory` (
    `postId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `PostCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`postId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StreamCategory` (
    `streamId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `StreamCategory_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`streamId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `articleMatchId` VARCHAR(191) NOT NULL,
    `streamId` VARCHAR(191) NOT NULL,
    `destinationId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `payloadJson` JSON NULL,
    `responseJson` JSON NULL,
    `remoteId` VARCHAR(191) NULL,
    `errorMessage` LONGTEXT NULL,
    `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublishAttempt_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PublishAttempt_destinationId_status_createdAt_idx`(`destinationId`, `status`, `createdAt`),
    INDEX `PublishAttempt_streamId_status_createdAt_idx`(`streamId`, `status`, `createdAt`),
    INDEX `PublishAttempt_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FetchRun` (
    `id` VARCHAR(191) NOT NULL,
    `streamId` VARCHAR(191) NOT NULL,
    `providerConfigId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NULL,
    `triggerType` VARCHAR(32) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `windowStart` DATETIME(3) NULL,
    `windowEnd` DATETIME(3) NULL,
    `fetchedCount` INTEGER NOT NULL DEFAULT 0,
    `publishableCount` INTEGER NOT NULL DEFAULT 0,
    `heldCount` INTEGER NOT NULL DEFAULT 0,
    `duplicateCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `queuedCount` INTEGER NOT NULL DEFAULT 0,
    `publishedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` LONGTEXT NULL,
    `providerCursorBeforeJson` JSON NULL,
    `providerCursorAfterJson` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FetchRun_streamId_startedAt_idx`(`streamId`, `startedAt`),
    INDEX `FetchRun_status_startedAt_idx`(`status`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminSession` ADD CONSTRAINT `AdminSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaVariant` ADD CONSTRAINT `MediaVariant_mediaAssetId_fkey` FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FetchedArticle` ADD CONSTRAINT `FetchedArticle_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `NewsProviderConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FetchedArticle` ADD CONSTRAINT `FetchedArticle_featuredMediaId_fkey` FOREIGN KEY (`featuredMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_sourceArticleId_fkey` FOREIGN KEY (`sourceArticleId`) REFERENCES `FetchedArticle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_featuredImageId_fkey` FOREIGN KEY (`featuredImageId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTranslation` ADD CONSTRAINT `PostTranslation_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTranslation` ADD CONSTRAINT `PostTranslation_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderFetchCheckpoint` ADD CONSTRAINT `ProviderFetchCheckpoint_streamId_fkey` FOREIGN KEY (`streamId`) REFERENCES `PublishingStream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderFetchCheckpoint` ADD CONSTRAINT `ProviderFetchCheckpoint_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `NewsProviderConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishingStream` ADD CONSTRAINT `PublishingStream_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishingStream` ADD CONSTRAINT `PublishingStream_activeProviderId_fkey` FOREIGN KEY (`activeProviderId`) REFERENCES `NewsProviderConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishingStream` ADD CONSTRAINT `PublishingStream_defaultTemplateId_fkey` FOREIGN KEY (`defaultTemplateId`) REFERENCES `DestinationTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishingStream` ADD CONSTRAINT `PublishingStream_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleMatch` ADD CONSTRAINT `ArticleMatch_fetchedArticleId_fkey` FOREIGN KEY (`fetchedArticleId`) REFERENCES `FetchedArticle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleMatch` ADD CONSTRAINT `ArticleMatch_streamId_fkey` FOREIGN KEY (`streamId`) REFERENCES `PublishingStream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleMatch` ADD CONSTRAINT `ArticleMatch_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleMatch` ADD CONSTRAINT `ArticleMatch_canonicalPostId_fkey` FOREIGN KEY (`canonicalPostId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleMatch` ADD CONSTRAINT `ArticleMatch_duplicateOfMatchId_fkey` FOREIGN KEY (`duplicateOfMatchId`) REFERENCES `ArticleMatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinationTemplate` ADD CONSTRAINT `DestinationTemplate_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinationTemplate` ADD CONSTRAINT `DestinationTemplate_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SEORecord` ADD CONSTRAINT `SEORecord_postTranslationId_fkey` FOREIGN KEY (`postTranslationId`) REFERENCES `PostTranslation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SEORecord` ADD CONSTRAINT `SEORecord_ogImageId_fkey` FOREIGN KEY (`ogImageId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViewEvent` ADD CONSTRAINT `ViewEvent_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViewEvent` ADD CONSTRAINT `ViewEvent_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategory` ADD CONSTRAINT `PostCategory_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostCategory` ADD CONSTRAINT `PostCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StreamCategory` ADD CONSTRAINT `StreamCategory_streamId_fkey` FOREIGN KEY (`streamId`) REFERENCES `PublishingStream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StreamCategory` ADD CONSTRAINT `StreamCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishAttempt` ADD CONSTRAINT `PublishAttempt_articleMatchId_fkey` FOREIGN KEY (`articleMatchId`) REFERENCES `ArticleMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishAttempt` ADD CONSTRAINT `PublishAttempt_streamId_fkey` FOREIGN KEY (`streamId`) REFERENCES `PublishingStream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishAttempt` ADD CONSTRAINT `PublishAttempt_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishAttempt` ADD CONSTRAINT `PublishAttempt_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FetchRun` ADD CONSTRAINT `FetchRun_streamId_fkey` FOREIGN KEY (`streamId`) REFERENCES `PublishingStream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FetchRun` ADD CONSTRAINT `FetchRun_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `NewsProviderConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FetchRun` ADD CONSTRAINT `FetchRun_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
