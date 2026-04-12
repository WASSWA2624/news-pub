-- CreateTable
CREATE TABLE `locale` (
    `code` VARCHAR(16) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'EDITOR') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_session` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `invalidated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_agent` VARCHAR(512) NULL,

    UNIQUE INDEX `admin_session_token_hash_key`(`token_hash`),
    INDEX `admin_session_expires_at_idx`(`expires_at`),
    INDEX `admin_session_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news_provider_config` (
    `id` VARCHAR(191) NOT NULL,
    `provider_key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `base_url` VARCHAR(2048) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `is_selectable` BOOLEAN NOT NULL DEFAULT true,
    `request_defaults_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `news_provider_config_provider_key_key`(`provider_key`),
    INDEX `news_provider_config_is_enabled_is_default_idx`(`is_enabled`, `is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `destination` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `kind` ENUM('WEBSITE', 'FACEBOOK_PROFILE', 'FACEBOOK_PAGE', 'INSTAGRAM_PERSONAL', 'INSTAGRAM_BUSINESS') NOT NULL,
    `account_handle` VARCHAR(191) NULL,
    `external_account_id` VARCHAR(191) NULL,
    `connection_status` ENUM('DISCONNECTED', 'CONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
    `connection_error` LONGTEXT NULL,
    `encrypted_token_ciphertext` LONGTEXT NULL,
    `encrypted_token_iv` VARCHAR(64) NULL,
    `encrypted_token_tag` VARCHAR(64) NULL,
    `token_hint` VARCHAR(64) NULL,
    `settings_json` JSON NULL,
    `last_checked_at` DATETIME(3) NULL,
    `last_connected_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `destination_slug_key`(`slug`),
    INDEX `destination_platform_connection_status_idx`(`platform`, `connection_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_name_key`(`name`),
    UNIQUE INDEX `category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_asset` (
    `id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(255) NULL,
    `file_size_bytes` INTEGER NULL,
    `storage_driver` VARCHAR(32) NOT NULL,
    `storage_key` VARCHAR(255) NULL,
    `public_url` VARCHAR(2048) NULL,
    `local_path` VARCHAR(512) NULL,
    `source_url` VARCHAR(2048) NULL,
    `source_domain` VARCHAR(191) NULL,
    `alt` LONGTEXT NULL,
    `caption` LONGTEXT NULL,
    `mime_type` VARCHAR(191) NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `attribution_text` LONGTEXT NULL,
    `license_type` VARCHAR(128) NULL,
    `license_notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_asset_source_domain_idx`(`source_domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_variant` (
    `id` VARCHAR(191) NOT NULL,
    `media_asset_id` VARCHAR(191) NOT NULL,
    `variant_key` VARCHAR(64) NOT NULL,
    `format` VARCHAR(32) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `file_size_bytes` INTEGER NULL,
    `storage_key` VARCHAR(255) NULL,
    `public_url` VARCHAR(2048) NULL,
    `local_path` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_variant_media_asset_id_idx`(`media_asset_id`),
    INDEX `media_variant_media_asset_id_variant_key_idx`(`media_asset_id`, `variant_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fetched_article` (
    `id` VARCHAR(191) NOT NULL,
    `provider_config_id` VARCHAR(191) NOT NULL,
    `featured_media_id` VARCHAR(191) NULL,
    `provider_article_id` VARCHAR(191) NULL,
    `dedupe_fingerprint` VARCHAR(191) NOT NULL,
    `source_url_hash` VARCHAR(64) NULL,
    `normalized_title_hash` VARCHAR(64) NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `source_url` VARCHAR(2048) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` LONGTEXT NULL,
    `body` LONGTEXT NULL,
    `author` VARCHAR(191) NULL,
    `published_at` DATETIME(3) NOT NULL,
    `image_url` VARCHAR(2048) NULL,
    `language` VARCHAR(32) NULL,
    `provider_categories_json` JSON NULL,
    `provider_countries_json` JSON NULL,
    `provider_regions_json` JSON NULL,
    `tags_json` JSON NULL,
    `raw_payload_json` JSON NULL,
    `fetch_timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fetched_article_dedupe_fingerprint_key`(`dedupe_fingerprint`),
    INDEX `fetched_article_provider_config_id_published_at_idx`(`provider_config_id`, `published_at`),
    INDEX `fetched_article_source_url_hash_published_at_idx`(`source_url_hash`, `published_at`),
    INDEX `fetched_article_normalized_title_hash_published_at_idx`(`normalized_title_hash`, `published_at`),
    UNIQUE INDEX `fetched_article_provider_config_id_provider_article_id_key`(`provider_config_id`, `provider_article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post` (
    `id` VARCHAR(191) NOT NULL,
    `source_article_id` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `editorial_stage` ENUM('INGESTED', 'REVIEWED', 'EDITED', 'APPROVED') NOT NULL DEFAULT 'INGESTED',
    `canonical_content_hash` VARCHAR(64) NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `source_url` VARCHAR(2048) NOT NULL,
    `provider_key` VARCHAR(64) NOT NULL,
    `excerpt` LONGTEXT NOT NULL,
    `featured_image_id` VARCHAR(191) NULL,
    `author_id` VARCHAR(191) NULL,
    `scheduled_publish_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `post_source_article_id_key`(`source_article_id`),
    UNIQUE INDEX `post_slug_key`(`slug`),
    INDEX `post_status_published_at_idx`(`status`, `published_at`),
    INDEX `post_status_published_at_updated_at_idx`(`status`, `published_at`, `updated_at`),
    INDEX `post_status_scheduled_publish_at_idx`(`status`, `scheduled_publish_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_translation` (
    `id` VARCHAR(191) NOT NULL,
    `post_id` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` LONGTEXT NOT NULL,
    `content_md` LONGTEXT NOT NULL,
    `content_html` LONGTEXT NOT NULL,
    `structured_content_json` JSON NOT NULL,
    `source_attribution` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `post_translation_locale_post_id_idx`(`locale`, `post_id`),
    UNIQUE INDEX `post_translation_post_id_locale_key`(`post_id`, `locale`),
    FULLTEXT INDEX `post_translation_content_md_fts_idx`(`content_md`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provider_fetch_checkpoint` (
    `id` VARCHAR(191) NOT NULL,
    `stream_id` VARCHAR(191) NOT NULL,
    `provider_config_id` VARCHAR(191) NOT NULL,
    `last_successful_fetch_at` DATETIME(3) NULL,
    `cursor_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `provider_fetch_checkpoint_stream_id_provider_config_id_key`(`stream_id`, `provider_config_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publishing_stream` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `destination_id` VARCHAR(191) NOT NULL,
    `active_provider_id` VARCHAR(191) NOT NULL,
    `default_template_id` VARCHAR(191) NULL,
    `locale` VARCHAR(16) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `schedule_interval_minutes` INTEGER NOT NULL DEFAULT 60,
    `schedule_expression` VARCHAR(128) NULL,
    `mode` ENUM('AUTO_PUBLISH', 'REVIEW_REQUIRED') NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `max_posts_per_run` INTEGER NOT NULL DEFAULT 5,
    `duplicate_window_hours` INTEGER NOT NULL DEFAULT 48,
    `retry_limit` INTEGER NOT NULL DEFAULT 3,
    `retry_backoff_minutes` INTEGER NOT NULL DEFAULT 15,
    `language_allowlist_json` JSON NULL,
    `country_allowlist_json` JSON NULL,
    `region_allowlist_json` JSON NULL,
    `include_keywords_json` JSON NULL,
    `exclude_keywords_json` JSON NULL,
    `settings_json` JSON NULL,
    `consecutive_failure_count` INTEGER NOT NULL DEFAULT 0,
    `last_run_started_at` DATETIME(3) NULL,
    `last_run_completed_at` DATETIME(3) NULL,
    `last_failure_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `publishing_stream_slug_key`(`slug`),
    INDEX `publishing_stream_status_destination_id_idx`(`status`, `destination_id`),
    INDEX `publishing_stream_destination_id_mode_status_idx`(`destination_id`, `mode`, `status`),
    INDEX `publishing_stream_active_provider_id_status_idx`(`active_provider_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_match` (
    `id` VARCHAR(191) NOT NULL,
    `fetched_article_id` VARCHAR(191) NOT NULL,
    `stream_id` VARCHAR(191) NOT NULL,
    `destination_id` VARCHAR(191) NOT NULL,
    `canonical_post_id` VARCHAR(191) NULL,
    `optimization_cache_id` VARCHAR(191) NULL,
    `status` ENUM('ELIGIBLE', 'HELD_FOR_REVIEW', 'QUEUED', 'PUBLISHED', 'FAILED', 'DUPLICATE', 'SKIPPED') NOT NULL,
    `workflow_stage` ENUM('INGESTED', 'OPTIMIZED', 'HELD', 'REVIEW_REQUIRED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'INGESTED',
    `optimization_status` ENUM('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FALLBACK', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'NOT_REQUESTED',
    `policy_status` ENUM('PASS', 'HOLD', 'BLOCK') NOT NULL DEFAULT 'PASS',
    `optimization_hash` VARCHAR(64) NULL,
    `optimized_payload_json` JSON NULL,
    `policy_reasons_json` JSON NULL,
    `readiness_checks_json` JSON NULL,
    `ban_risk_score` INTEGER NULL,
    `last_optimized_at` DATETIME(3) NULL,
    `last_policy_checked_at` DATETIME(3) NULL,
    `review_notes` LONGTEXT NULL,
    `filter_reasons_json` JSON NULL,
    `hold_reasons_json` JSON NULL,
    `duplicate_of_match_id` VARCHAR(191) NULL,
    `duplicate_fingerprint` VARCHAR(191) NULL,
    `queued_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `override_notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `article_match_stream_id_status_idx`(`stream_id`, `status`),
    INDEX `article_match_stream_id_workflow_stage_idx`(`stream_id`, `workflow_stage`),
    INDEX `article_match_destination_id_status_idx`(`destination_id`, `status`),
    INDEX `article_match_destination_id_policy_status_idx`(`destination_id`, `policy_status`),
    INDEX `article_match_canonical_post_id_idx`(`canonical_post_id`),
    UNIQUE INDEX `article_match_fetched_article_id_stream_id_key`(`fetched_article_id`, `stream_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `optimization_cache` (
    `id` VARCHAR(191) NOT NULL,
    `cache_key` VARCHAR(191) NOT NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `settings_hash` VARCHAR(64) NOT NULL,
    `optimization_hash` VARCHAR(64) NOT NULL,
    `locale` VARCHAR(16) NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `destination_kind` ENUM('WEBSITE', 'FACEBOOK_PROFILE', 'FACEBOOK_PAGE', 'INSTAGRAM_PERSONAL', 'INSTAGRAM_BUSINESS') NOT NULL,
    `status` ENUM('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FALLBACK', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `policy_status` ENUM('PASS', 'HOLD', 'BLOCK') NOT NULL DEFAULT 'PASS',
    `provider` VARCHAR(64) NULL,
    `model` VARCHAR(128) NULL,
    `used_fallback` BOOLEAN NOT NULL DEFAULT false,
    `ban_risk_score` INTEGER NULL,
    `result_json` JSON NULL,
    `warnings_json` JSON NULL,
    `error_message` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `optimization_cache_cache_key_key`(`cache_key`),
    INDEX `optimization_cache_platform_destination_kind_locale_idx`(`platform`, `destination_kind`, `locale`),
    INDEX `optimization_cache_status_updated_at_idx`(`status`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `destination_template` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `locale` VARCHAR(16) NULL,
    `category_id` VARCHAR(191) NULL,
    `title_template` LONGTEXT NULL,
    `summary_template` LONGTEXT NULL,
    `body_template` LONGTEXT NOT NULL,
    `hashtags_template` LONGTEXT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `destination_template_platform_locale_is_default_idx`(`platform`, `locale`, `is_default`),
    INDEX `destination_template_platform_category_id_idx`(`platform`, `category_id`),
    UNIQUE INDEX `destination_template_name_platform_locale_key`(`name`, `platform`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seo_record` (
    `id` VARCHAR(191) NOT NULL,
    `post_translation_id` VARCHAR(191) NOT NULL,
    `canonical_url` VARCHAR(2048) NOT NULL,
    `meta_title` VARCHAR(255) NOT NULL,
    `meta_description` LONGTEXT NOT NULL,
    `og_title` VARCHAR(255) NOT NULL,
    `og_description` LONGTEXT NOT NULL,
    `og_image_id` VARCHAR(191) NULL,
    `twitter_title` VARCHAR(255) NOT NULL,
    `twitter_description` LONGTEXT NOT NULL,
    `keywords_json` JSON NOT NULL,
    `authors_json` JSON NOT NULL,
    `noindex` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seo_record_post_translation_id_key`(`post_translation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `view_event` (
    `id` VARCHAR(191) NOT NULL,
    `post_id` VARCHAR(191) NULL,
    `path` VARCHAR(2048) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `event_type` ENUM('WEBSITE_VIEW', 'PAGE_VIEW', 'POST_VIEW', 'SEARCH_VIEW') NOT NULL,
    `ip_hash` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(512) NULL,
    `referrer` VARCHAR(2048) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `view_event_event_type_created_at_idx`(`event_type`, `created_at`),
    INDEX `view_event_post_id_created_at_idx`(`post_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `web_vital_metric` (
    `id` VARCHAR(191) NOT NULL,
    `metric_id` VARCHAR(128) NOT NULL,
    `name` VARCHAR(16) NOT NULL,
    `rating` VARCHAR(16) NOT NULL,
    `path` VARCHAR(2048) NOT NULL,
    `route_group` VARCHAR(64) NOT NULL,
    `locale` VARCHAR(16) NULL,
    `label` VARCHAR(32) NULL,
    `navigation_type` VARCHAR(32) NULL,
    `form_factor` VARCHAR(16) NOT NULL,
    `connection_type` VARCHAR(32) NULL,
    `viewport_width` INTEGER NULL,
    `viewport_height` INTEGER NULL,
    `value` DOUBLE NOT NULL,
    `delta` DOUBLE NULL,
    `build_id` VARCHAR(128) NULL,
    `attribution_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `web_vital_metric_name_created_at_idx`(`name`, `created_at`),
    INDEX `web_vital_metric_path_name_created_at_idx`(`path`(191), `name`, `created_at`),
    INDEX `web_vital_metric_route_group_name_created_at_idx`(`route_group`, `name`, `created_at`),
    INDEX `web_vital_metric_form_factor_name_created_at_idx`(`form_factor`, `name`, `created_at`),
    INDEX `web_vital_metric_build_id_name_created_at_idx`(`build_id`, `name`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_event` (
    `id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `entity_type` VARCHAR(64) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `payload_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_category` (
    `post_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,

    INDEX `post_category_category_id_idx`(`category_id`),
    PRIMARY KEY (`post_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stream_category` (
    `stream_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,

    INDEX `stream_category_category_id_idx`(`category_id`),
    PRIMARY KEY (`stream_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publish_attempt` (
    `id` VARCHAR(191) NOT NULL,
    `article_match_id` VARCHAR(191) NOT NULL,
    `stream_id` VARCHAR(191) NOT NULL,
    `destination_id` VARCHAR(191) NOT NULL,
    `post_id` VARCHAR(191) NULL,
    `platform` ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attempt_number` INTEGER NOT NULL DEFAULT 1,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `payload_json` JSON NULL,
    `response_json` JSON NULL,
    `diagnostics_json` JSON NULL,
    `remote_id` VARCHAR(191) NULL,
    `last_error_code` VARCHAR(128) NULL,
    `last_error_message` LONGTEXT NULL,
    `retryable` BOOLEAN NOT NULL DEFAULT false,
    `queued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `publish_attempt_idempotency_key_key`(`idempotency_key`),
    INDEX `publish_attempt_destination_id_status_created_at_idx`(`destination_id`, `status`, `created_at`),
    INDEX `publish_attempt_stream_id_status_created_at_idx`(`stream_id`, `status`, `created_at`),
    INDEX `publish_attempt_post_id_platform_status_idx`(`post_id`, `platform`, `status`),
    INDEX `publish_attempt_post_id_created_at_idx`(`post_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fetch_run` (
    `id` VARCHAR(191) NOT NULL,
    `stream_id` VARCHAR(191) NOT NULL,
    `provider_config_id` VARCHAR(191) NOT NULL,
    `requested_by_id` VARCHAR(191) NULL,
    `trigger_type` VARCHAR(32) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `last_error_message` LONGTEXT NULL,
    `window_start` DATETIME(3) NULL,
    `window_end` DATETIME(3) NULL,
    `fetched_count` INTEGER NOT NULL DEFAULT 0,
    `publishable_count` INTEGER NOT NULL DEFAULT 0,
    `held_count` INTEGER NOT NULL DEFAULT 0,
    `duplicate_count` INTEGER NOT NULL DEFAULT 0,
    `skipped_count` INTEGER NOT NULL DEFAULT 0,
    `queued_count` INTEGER NOT NULL DEFAULT 0,
    `optimized_count` INTEGER NOT NULL DEFAULT 0,
    `blocked_count` INTEGER NOT NULL DEFAULT 0,
    `ai_cache_hit_count` INTEGER NOT NULL DEFAULT 0,
    `published_count` INTEGER NOT NULL DEFAULT 0,
    `failed_count` INTEGER NOT NULL DEFAULT 0,
    `provider_cursor_before_json` JSON NULL,
    `provider_cursor_after_json` JSON NULL,
    `execution_details_json` JSON NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fetch_run_stream_id_started_at_idx`(`stream_id`, `started_at`),
    INDEX `fetch_run_status_started_at_idx`(`status`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_session` ADD CONSTRAINT `admin_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_variant` ADD CONSTRAINT `media_variant_media_asset_id_fkey` FOREIGN KEY (`media_asset_id`) REFERENCES `media_asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fetched_article` ADD CONSTRAINT `fetched_article_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `news_provider_config`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fetched_article` ADD CONSTRAINT `fetched_article_featured_media_id_fkey` FOREIGN KEY (`featured_media_id`) REFERENCES `media_asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_source_article_id_fkey` FOREIGN KEY (`source_article_id`) REFERENCES `fetched_article`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_featured_image_id_fkey` FOREIGN KEY (`featured_image_id`) REFERENCES `media_asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_translation` ADD CONSTRAINT `post_translation_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_translation` ADD CONSTRAINT `post_translation_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_fetch_checkpoint` ADD CONSTRAINT `provider_fetch_checkpoint_stream_id_fkey` FOREIGN KEY (`stream_id`) REFERENCES `publishing_stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_fetch_checkpoint` ADD CONSTRAINT `provider_fetch_checkpoint_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `news_provider_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publishing_stream` ADD CONSTRAINT `publishing_stream_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publishing_stream` ADD CONSTRAINT `publishing_stream_active_provider_id_fkey` FOREIGN KEY (`active_provider_id`) REFERENCES `news_provider_config`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publishing_stream` ADD CONSTRAINT `publishing_stream_default_template_id_fkey` FOREIGN KEY (`default_template_id`) REFERENCES `destination_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publishing_stream` ADD CONSTRAINT `publishing_stream_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_fetched_article_id_fkey` FOREIGN KEY (`fetched_article_id`) REFERENCES `fetched_article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_stream_id_fkey` FOREIGN KEY (`stream_id`) REFERENCES `publishing_stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_canonical_post_id_fkey` FOREIGN KEY (`canonical_post_id`) REFERENCES `post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_optimization_cache_id_fkey` FOREIGN KEY (`optimization_cache_id`) REFERENCES `optimization_cache`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_match` ADD CONSTRAINT `article_match_duplicate_of_match_id_fkey` FOREIGN KEY (`duplicate_of_match_id`) REFERENCES `article_match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `optimization_cache` ADD CONSTRAINT `optimization_cache_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `locale`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `destination_template` ADD CONSTRAINT `destination_template_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `locale`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `destination_template` ADD CONSTRAINT `destination_template_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seo_record` ADD CONSTRAINT `seo_record_post_translation_id_fkey` FOREIGN KEY (`post_translation_id`) REFERENCES `post_translation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seo_record` ADD CONSTRAINT `seo_record_og_image_id_fkey` FOREIGN KEY (`og_image_id`) REFERENCES `media_asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `view_event` ADD CONSTRAINT `view_event_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `view_event` ADD CONSTRAINT `view_event_locale_fkey` FOREIGN KEY (`locale`) REFERENCES `locale`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_event` ADD CONSTRAINT `audit_event_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_category` ADD CONSTRAINT `post_category_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_category` ADD CONSTRAINT `post_category_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stream_category` ADD CONSTRAINT `stream_category_stream_id_fkey` FOREIGN KEY (`stream_id`) REFERENCES `publishing_stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stream_category` ADD CONSTRAINT `stream_category_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publish_attempt` ADD CONSTRAINT `publish_attempt_article_match_id_fkey` FOREIGN KEY (`article_match_id`) REFERENCES `article_match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publish_attempt` ADD CONSTRAINT `publish_attempt_stream_id_fkey` FOREIGN KEY (`stream_id`) REFERENCES `publishing_stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publish_attempt` ADD CONSTRAINT `publish_attempt_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publish_attempt` ADD CONSTRAINT `publish_attempt_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fetch_run` ADD CONSTRAINT `fetch_run_stream_id_fkey` FOREIGN KEY (`stream_id`) REFERENCES `publishing_stream`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fetch_run` ADD CONSTRAINT `fetch_run_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `news_provider_config`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fetch_run` ADD CONSTRAINT `fetch_run_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
