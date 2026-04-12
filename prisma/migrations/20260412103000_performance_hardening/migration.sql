CREATE TABLE `webvitalmetric` (
  `id` VARCHAR(191) NOT NULL,
  `metricId` VARCHAR(128) NOT NULL,
  `name` VARCHAR(16) NOT NULL,
  `rating` VARCHAR(16) NOT NULL,
  `path` VARCHAR(2048) NOT NULL,
  `routeGroup` VARCHAR(64) NOT NULL,
  `locale` VARCHAR(16) NULL,
  `label` VARCHAR(32) NULL,
  `navigationType` VARCHAR(32) NULL,
  `formFactor` VARCHAR(16) NOT NULL,
  `connectionType` VARCHAR(32) NULL,
  `viewportWidth` INTEGER NULL,
  `viewportHeight` INTEGER NULL,
  `value` DOUBLE NOT NULL,
  `delta` DOUBLE NULL,
  `buildId` VARCHAR(128) NULL,
  `attributionJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `webvitalmetric_name_createdAt_idx` ON `webvitalmetric`(`name`, `createdAt`);
CREATE INDEX `webvitalmetric_path_name_createdAt_idx` ON `webvitalmetric`(`path`(191), `name`, `createdAt`);
CREATE INDEX `webvitalmetric_routeGroup_name_createdAt_idx` ON `webvitalmetric`(`routeGroup`, `name`, `createdAt`);
CREATE INDEX `webvitalmetric_formFactor_name_createdAt_idx` ON `webvitalmetric`(`formFactor`, `name`, `createdAt`);
CREATE INDEX `webvitalmetric_buildId_name_createdAt_idx` ON `webvitalmetric`(`buildId`, `name`, `createdAt`);

CREATE INDEX `post_status_publishedAt_updatedAt_idx` ON `post`(`status`, `publishedAt`, `updatedAt`);
CREATE INDEX `publishattempt_postId_platform_status_idx` ON `publishattempt`(`postId`, `platform`, `status`);

CREATE FULLTEXT INDEX `posttranslation_contentMd_fts_idx` ON `posttranslation`(`contentMd`);
