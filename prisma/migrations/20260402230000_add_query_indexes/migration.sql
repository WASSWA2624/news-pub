-- CreateIndex
CREATE INDEX `Post_status_publishedAt_idx` ON `Post`(`status`, `publishedAt`);

-- CreateIndex
CREATE INDEX `Post_status_scheduledPublishAt_idx` ON `Post`(`status`, `scheduledPublishAt`);

-- CreateIndex
CREATE INDEX `PostTranslation_locale_postId_idx` ON `PostTranslation`(`locale`, `postId`);

-- CreateIndex
CREATE INDEX `ViewEvent_eventType_createdAt_idx` ON `ViewEvent`(`eventType`, `createdAt`);

-- CreateIndex
CREATE INDEX `ViewEvent_postId_createdAt_idx` ON `ViewEvent`(`postId`, `createdAt`);
