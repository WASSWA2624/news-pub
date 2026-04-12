ALTER TABLE `publishing_stream`
    ADD COLUMN `next_run_at` DATETIME(3) NULL;

CREATE INDEX `publishing_stream_status_next_run_at_idx`
    ON `publishing_stream`(`status`, `next_run_at`);

ALTER TABLE `publish_attempt`
    ADD COLUMN `last_error_at` DATETIME(3) NULL,
    ADD COLUMN `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lease_owner` VARCHAR(191) NULL,
    ADD COLUMN `lease_expires_at` DATETIME(3) NULL,
    ADD COLUMN `heartbeat_at` DATETIME(3) NULL,
    ADD COLUMN `orphaned_at` DATETIME(3) NULL;

DROP INDEX `publish_attempt_destination_id_status_created_at_idx` ON `publish_attempt`;
DROP INDEX `publish_attempt_stream_id_status_created_at_idx` ON `publish_attempt`;

CREATE INDEX `publish_attempt_destination_id_status_available_at_idx`
    ON `publish_attempt`(`destination_id`, `status`, `available_at`);
CREATE INDEX `publish_attempt_stream_id_status_available_at_idx`
    ON `publish_attempt`(`stream_id`, `status`, `available_at`);
CREATE INDEX `publish_attempt_status_lease_expires_at_idx`
    ON `publish_attempt`(`status`, `lease_expires_at`);

ALTER TABLE `fetch_run`
    ADD COLUMN `queue_key` VARCHAR(191) NULL,
    ADD COLUMN `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lease_owner` VARCHAR(191) NULL,
    ADD COLUMN `lease_expires_at` DATETIME(3) NULL,
    ADD COLUMN `heartbeat_at` DATETIME(3) NULL,
    ADD COLUMN `attempt_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `last_error_code` VARCHAR(128) NULL,
    ADD COLUMN `last_error_at` DATETIME(3) NULL,
    ADD COLUMN `orphaned_at` DATETIME(3) NULL,
    MODIFY COLUMN `started_at` DATETIME(3) NULL;

DROP INDEX `fetch_run_status_started_at_idx` ON `fetch_run`;

CREATE UNIQUE INDEX `fetch_run_queue_key_key`
    ON `fetch_run`(`queue_key`);
CREATE INDEX `fetch_run_status_available_at_idx`
    ON `fetch_run`(`status`, `available_at`);
CREATE INDEX `fetch_run_status_lease_expires_at_idx`
    ON `fetch_run`(`status`, `lease_expires_at`);
