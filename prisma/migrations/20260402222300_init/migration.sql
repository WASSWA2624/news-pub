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
CREATE TABLE `Equipment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Equipment_normalizedName_key`(`normalizedName`),
    UNIQUE INDEX `Equipment_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentAlias` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `normalizedAlias` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `EquipmentAlias_normalizedAlias_key`(`normalizedAlias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `editorialStage` ENUM('GENERATED', 'REVIEWED', 'EDITED', 'APPROVED') NOT NULL DEFAULT 'GENERATED',
    `excerpt` LONGTEXT NOT NULL,
    `featuredImageId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `scheduledPublishAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Post_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `contentMd` LONGTEXT NOT NULL,
    `contentHtml` LONGTEXT NOT NULL,
    `structuredContentJson` JSON NOT NULL,
    `excerpt` LONGTEXT NOT NULL,
    `disclaimer` LONGTEXT NOT NULL,
    `faqJson` JSON NOT NULL,
    `isAutoTranslated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PostTranslation_postId_locale_key`(`postId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name`),
    UNIQUE INDEX `Tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Manufacturer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `primaryDomain` VARCHAR(191) NOT NULL,
    `headquartersCountry` VARCHAR(64) NULL,
    `branchCountriesJson` JSON NULL,
    `rankingScore` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Manufacturer_slug_key`(`slug`),
    UNIQUE INDEX `Manufacturer_normalizedName_primaryDomain_key`(`normalizedName`, `primaryDomain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManufacturerAlias` (
    `id` VARCHAR(191) NOT NULL,
    `manufacturerId` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `normalizedAlias` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ManufacturerAlias_manufacturerId_normalizedAlias_key`(`manufacturerId`, `normalizedAlias`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Model` (
    `id` VARCHAR(191) NOT NULL,
    `manufacturerId` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `latestKnownYear` INTEGER NULL,
    `summary` LONGTEXT NULL,
    `rankingScore` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Model_manufacturerId_slug_key`(`manufacturerId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fault` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `normalizedTitle` VARCHAR(255) NOT NULL,
    `cause` LONGTEXT NOT NULL,
    `symptoms` LONGTEXT NOT NULL,
    `remedy` LONGTEXT NOT NULL,
    `severity` VARCHAR(64) NOT NULL,
    `evidenceCount` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Fault_postId_normalizedTitle_key`(`postId`, `normalizedTitle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceTask` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
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
    `usageNotes` LONGTEXT NULL,
    `isAiGenerated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceReference` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `equipmentId` VARCHAR(191) NULL,
    `manufacturerId` VARCHAR(191) NULL,
    `modelId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `sourceDomain` VARCHAR(191) NOT NULL,
    `sourceType` ENUM('OFFICIAL_MANUFACTURER_WEBSITE', 'OFFICIAL_PRODUCT_PAGE', 'OFFICIAL_MANUAL', 'OFFICIAL_DISTRIBUTOR_DOCUMENTATION', 'TRUSTED_BIOMEDICAL_REFERENCE', 'TRUSTED_PROFESSIONAL_SOCIETY', 'REPUTABLE_EDUCATIONAL_INSTITUTION', 'APPROVED_SEARCH_RESULT') NOT NULL,
    `fileType` VARCHAR(64) NULL,
    `language` VARCHAR(32) NULL,
    `accessStatus` VARCHAR(64) NULL,
    `reliabilityTier` VARCHAR(64) NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `notes` LONGTEXT NULL,
    `excerpt` LONGTEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `body` LONGTEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SPAM') NOT NULL DEFAULT 'PENDING',
    `ipHash` VARCHAR(255) NOT NULL,
    `userAgent` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommentModerationEvent` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(64) NOT NULL,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GenerationJob` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `equipmentName` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `providerConfigId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `currentStage` VARCHAR(128) NULL,
    `requestJson` JSON NOT NULL,
    `responseJson` JSON NULL,
    `warningJson` JSON NULL,
    `errorMessage` LONGTEXT NULL,
    `replaceExistingPost` BOOLEAN NOT NULL DEFAULT false,
    `schedulePublishAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(64) NOT NULL,
    `version` INTEGER NOT NULL,
    `systemPrompt` LONGTEXT NOT NULL,
    `userPromptTemplate` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptTemplate_purpose_version_key`(`purpose`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceConfig` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sourceType` ENUM('OFFICIAL_MANUFACTURER_WEBSITE', 'OFFICIAL_PRODUCT_PAGE', 'OFFICIAL_MANUAL', 'OFFICIAL_DISTRIBUTOR_DOCUMENTATION', 'TRUSTED_BIOMEDICAL_REFERENCE', 'TRUSTED_PROFESSIONAL_SOCIETY', 'REPUTABLE_EDUCATIONAL_INSTITUTION', 'APPROVED_SEARCH_RESULT') NOT NULL,
    `priority` INTEGER NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `allowedDomainsJson` JSON NOT NULL,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SourceConfig_sourceType_key`(`sourceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModelProviderConfig` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `model` VARCHAR(128) NOT NULL,
    `purpose` VARCHAR(64) NOT NULL,
    `apiKeyEnvName` VARCHAR(64) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ModelProviderConfig_provider_model_purpose_key`(`provider`, `model`, `purpose`),
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
    `eventType` ENUM('WEBSITE_VIEW', 'PAGE_VIEW', 'POST_VIEW') NOT NULL,
    `ipHash` VARCHAR(255) NOT NULL,
    `userAgent` VARCHAR(512) NULL,
    `referrer` VARCHAR(2048) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

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
CREATE TABLE `PostTag` (
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `PostTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostManufacturer` (
    `postId` VARCHAR(191) NOT NULL,
    `manufacturerId` VARCHAR(191) NOT NULL,

    INDEX `PostManufacturer_manufacturerId_idx`(`manufacturerId`),
    PRIMARY KEY (`postId`, `manufacturerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EquipmentAlias` ADD CONSTRAINT `EquipmentAlias_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_featuredImageId_fkey` FOREIGN KEY (`featuredImageId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTranslation` ADD CONSTRAINT `PostTranslation_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTranslation` ADD CONSTRAINT `PostTranslation_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturerAlias` ADD CONSTRAINT `ManufacturerAlias_manufacturerId_fkey` FOREIGN KEY (`manufacturerId`) REFERENCES `Manufacturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Model` ADD CONSTRAINT `Model_manufacturerId_fkey` FOREIGN KEY (`manufacturerId`) REFERENCES `Manufacturer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Model` ADD CONSTRAINT `Model_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fault` ADD CONSTRAINT `Fault_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceTask` ADD CONSTRAINT `MaintenanceTask_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceReference` ADD CONSTRAINT `SourceReference_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceReference` ADD CONSTRAINT `SourceReference_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceReference` ADD CONSTRAINT `SourceReference_manufacturerId_fkey` FOREIGN KEY (`manufacturerId`) REFERENCES `Manufacturer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceReference` ADD CONSTRAINT `SourceReference_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentModerationEvent` ADD CONSTRAINT `CommentModerationEvent_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentModerationEvent` ADD CONSTRAINT `CommentModerationEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GenerationJob` ADD CONSTRAINT `GenerationJob_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GenerationJob` ADD CONSTRAINT `GenerationJob_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `Locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GenerationJob` ADD CONSTRAINT `GenerationJob_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `ModelProviderConfig`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostManufacturer` ADD CONSTRAINT `PostManufacturer_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostManufacturer` ADD CONSTRAINT `PostManufacturer_manufacturerId_fkey` FOREIGN KEY (`manufacturerId`) REFERENCES `Manufacturer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
