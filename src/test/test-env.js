/**
 * Provides the minimum NewsPub environment contract required by runtime tests.
 */
export function createNewsPubTestEnv(overrides = {}) {
  return {
    DATABASE_URL: "mysql://user:password@localhost:3306/news_pub_test",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    SESSION_SECRET: "session-secret",
    SESSION_MAX_AGE_SECONDS: "3600",
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "strong-password",
    MEDIASTACK_API_KEY: "",
    NEWSDATA_API_KEY: "",
    NEWSAPI_API_KEY: "",
    DESTINATION_TOKEN_ENCRYPTION_KEY: "destination-secret",
    MEDIA_DRIVER: "local",
    LOCAL_MEDIA_BASE_PATH: "public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    S3_MEDIA_BUCKET: "",
    S3_MEDIA_REGION: "",
    S3_MEDIA_BASE_URL: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    UPLOAD_ALLOWED_MIME_TYPES: "image/jpeg,image/png,image/webp",
    MEDIA_MAX_REMOTE_FILE_BYTES: "5242880",
    REVALIDATE_SECRET: "revalidate-secret",
    CRON_SECRET: "cron-secret",
    ENABLE_ANALYTICS: "true",
    ENABLE_METRICS: "true",
    DEFAULT_SCHEDULE_TIMEZONE: "UTC",
    INITIAL_BACKFILL_HOURS: "24",
    ...overrides,
  };
}
