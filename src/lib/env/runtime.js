import { z } from "zod";

const localeCodePattern = /^[a-z]{2}(?:-[a-z]{2})?$/;
const mimeTypePattern = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i;

function requiredString(name) {
  return z.string().trim().min(1, {
    message: `${name} is required.`,
  });
}

function optionalString() {
  return z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional();
}

function integerString(name) {
  return requiredString(name)
    .regex(/^\d+$/, {
      message: `${name} must be a whole number.`,
    })
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value > 0, {
      message: `${name} must be greater than 0.`,
    });
}

function booleanString(name) {
  return requiredString(name).transform((value, context) => {
    const normalized = value.toLowerCase();

    if (normalized !== "true" && normalized !== "false") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} must be "true" or "false".`,
      });

      return z.NEVER;
    }

    return normalized === "true";
  });
}

function optionalIntegerString(name) {
  return optionalString().transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }

    if (!/^\d+$/.test(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} must be a whole number.`,
      });

      return z.NEVER;
    }

    const parsed = Number.parseInt(value, 10);

    if (parsed <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} must be greater than 0.`,
      });

      return z.NEVER;
    }

    return parsed;
  });
}

function optionalCsvString(name) {
  return optionalString().transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });
}

function csvString(name) {
  return requiredString(name).transform((value, context) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!items.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} must include at least one value.`,
      });

      return z.NEVER;
    }

    return items;
  });
}

function localeString(name) {
  return requiredString(name).regex(localeCodePattern, {
    message: `${name} must use lowercase locale codes like "en" or "fr".`,
  });
}

function optionalUrlString(name) {
  return optionalString().refine(
    (value) =>
      value === undefined ||
      (URL.canParse(value) && ["http:", "https:"].includes(new URL(value).protocol)),
    {
      message: `${name} must be a valid http or https URL.`,
    },
  );
}

function optionalJsonObjectString(name) {
  return optionalString().transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} must be a valid JSON object.`,
        });

        return z.NEVER;
      }

      return parsed;
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} must be a valid JSON object.`,
      });

      return z.NEVER;
    }
  });
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

const sharedEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: requiredString("NEXT_PUBLIC_APP_URL")
      .url({
        message: "NEXT_PUBLIC_APP_URL must be a valid URL.",
      })
      .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
        message: "NEXT_PUBLIC_APP_URL must use http or https.",
      })
      .transform(normalizeBaseUrl),
    DEFAULT_LOCALE: localeString("DEFAULT_LOCALE"),
    SUPPORTED_LOCALES: csvString("SUPPORTED_LOCALES"),
  })
  .superRefine((env, context) => {
    const duplicateLocales = env.SUPPORTED_LOCALES.filter(
      (locale, index) => env.SUPPORTED_LOCALES.indexOf(locale) !== index,
    );

    if (duplicateLocales.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPPORTED_LOCALES"],
        message: `SUPPORTED_LOCALES contains duplicates: ${[...new Set(duplicateLocales)].join(", ")}.`,
      });
    }

    env.SUPPORTED_LOCALES.forEach((locale, index) => {
      if (!localeCodePattern.test(locale)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SUPPORTED_LOCALES", index],
          message: `SUPPORTED_LOCALES contains an invalid locale code: ${locale}.`,
        });
      }
    });

    if (!env.SUPPORTED_LOCALES.includes(env.DEFAULT_LOCALE)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEFAULT_LOCALE"],
        message: "DEFAULT_LOCALE must be included in SUPPORTED_LOCALES.",
      });
    }
  });

const serverEnvSchema = sharedEnvSchema
  .extend({
    DATABASE_URL: requiredString("DATABASE_URL").url({
      message: "DATABASE_URL must be a valid database URL.",
    }),
    SESSION_SECRET: requiredString("SESSION_SECRET"),
    SESSION_MAX_AGE_SECONDS: integerString("SESSION_MAX_AGE_SECONDS"),
    ADMIN_SEED_EMAIL: requiredString("ADMIN_SEED_EMAIL").email({
      message: "ADMIN_SEED_EMAIL must be a valid email address.",
    }),
    ADMIN_SEED_PASSWORD: requiredString("ADMIN_SEED_PASSWORD"),
    MEDIASTACK_API_KEY: optionalString(),
    NEWSDATA_API_KEY: optionalString(),
    NEWSAPI_API_KEY: optionalString(),
    DESTINATION_TOKEN_ENCRYPTION_KEY: requiredString("DESTINATION_TOKEN_ENCRYPTION_KEY"),
    META_USER_ACCESS_TOKEN: optionalString(),
    META_APP_ID: optionalString(),
    META_APP_SECRET: optionalString(),
    META_GRAPH_API_BASE_URL: optionalUrlString("META_GRAPH_API_BASE_URL"),
    META_ALLOWED_PAGE_IDS: optionalCsvString("META_ALLOWED_PAGE_IDS"),
    META_DESTINATION_CREDENTIALS_JSON: optionalJsonObjectString("META_DESTINATION_CREDENTIALS_JSON"),
    META_SOCIAL_MIN_POST_INTERVAL_MINUTES: optionalIntegerString("META_SOCIAL_MIN_POST_INTERVAL_MINUTES"),
    META_SOCIAL_DUPLICATE_COOLDOWN_HOURS: optionalIntegerString("META_SOCIAL_DUPLICATE_COOLDOWN_HOURS"),
    META_FACEBOOK_MAX_POSTS_PER_24H: optionalIntegerString("META_FACEBOOK_MAX_POSTS_PER_24H"),
    META_INSTAGRAM_MAX_POSTS_PER_24H: optionalIntegerString("META_INSTAGRAM_MAX_POSTS_PER_24H"),
    META_INSTAGRAM_MAX_HASHTAGS: optionalIntegerString("META_INSTAGRAM_MAX_HASHTAGS"),
    MEDIA_DRIVER: requiredString("MEDIA_DRIVER"),
    LOCAL_MEDIA_BASE_PATH: optionalString(),
    LOCAL_MEDIA_BASE_URL: optionalString(),
    S3_MEDIA_BUCKET: optionalString(),
    S3_MEDIA_REGION: optionalString(),
    S3_MEDIA_BASE_URL: optionalUrlString("S3_MEDIA_BASE_URL"),
    S3_ACCESS_KEY_ID: optionalString(),
    S3_SECRET_ACCESS_KEY: optionalString(),
    UPLOAD_ALLOWED_MIME_TYPES: csvString("UPLOAD_ALLOWED_MIME_TYPES"),
    MEDIA_MAX_REMOTE_FILE_BYTES: integerString("MEDIA_MAX_REMOTE_FILE_BYTES"),
    REVALIDATE_SECRET: requiredString("REVALIDATE_SECRET"),
    CRON_SECRET: requiredString("CRON_SECRET"),
    ENABLE_ANALYTICS: booleanString("ENABLE_ANALYTICS"),
    ENABLE_METRICS: booleanString("ENABLE_METRICS"),
    DEFAULT_SCHEDULE_TIMEZONE: requiredString("DEFAULT_SCHEDULE_TIMEZONE"),
    INITIAL_BACKFILL_HOURS: integerString("INITIAL_BACKFILL_HOURS"),
  })
  .superRefine((env, context) => {
    const supportedMediaDrivers = ["local", "s3"];

    if (!supportedMediaDrivers.includes(env.MEDIA_DRIVER)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEDIA_DRIVER"],
        message: `MEDIA_DRIVER must be one of: ${supportedMediaDrivers.join(", ")}.`,
      });
    }

    if (Boolean(env.META_APP_ID) !== Boolean(env.META_APP_SECRET)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["META_APP_ID"],
        message: "META_APP_ID and META_APP_SECRET must be provided together.",
      });
    }

    if (env.META_DESTINATION_CREDENTIALS_JSON) {
      for (const [slug, value] of Object.entries(env.META_DESTINATION_CREDENTIALS_JSON)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["META_DESTINATION_CREDENTIALS_JSON", slug],
            message: `META_DESTINATION_CREDENTIALS_JSON.${slug} must be an object.`,
          });
        }
      }
    }

    if (env.MEDIA_DRIVER === "local") {
      if (!env.LOCAL_MEDIA_BASE_PATH) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["LOCAL_MEDIA_BASE_PATH"],
          message: "LOCAL_MEDIA_BASE_PATH is required when MEDIA_DRIVER=local.",
        });
      }

      if (!env.LOCAL_MEDIA_BASE_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["LOCAL_MEDIA_BASE_URL"],
          message: "LOCAL_MEDIA_BASE_URL is required when MEDIA_DRIVER=local.",
        });
      }
    }

    if (env.LOCAL_MEDIA_BASE_URL && !env.LOCAL_MEDIA_BASE_URL.startsWith("/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LOCAL_MEDIA_BASE_URL"],
        message: "LOCAL_MEDIA_BASE_URL must start with '/'.",
      });
    }

    if (env.MEDIA_DRIVER === "s3") {
      ["S3_MEDIA_BUCKET", "S3_MEDIA_REGION", "S3_MEDIA_BASE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].forEach(
        (key) => {
          if (!env[key]) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${key} is required when MEDIA_DRIVER=s3.`,
            });
          }
        },
      );
    }

    env.UPLOAD_ALLOWED_MIME_TYPES.forEach((mimeType, index) => {
      if (!mimeTypePattern.test(mimeType)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPLOAD_ALLOWED_MIME_TYPES", index],
          message: `UPLOAD_ALLOWED_MIME_TYPES contains an invalid MIME type: ${mimeType}.`,
        });
      }
    });
  });

function mapSharedEnv(parsedEnv) {
  return {
    app: {
      url: parsedEnv.NEXT_PUBLIC_APP_URL,
    },
    i18n: {
      defaultLocale: parsedEnv.DEFAULT_LOCALE,
      supportedLocales: parsedEnv.SUPPORTED_LOCALES,
    },
  };
}

function mapServerEnv(parsedEnv) {
  return {
    ...mapSharedEnv(parsedEnv),
    auth: {
      adminSeed: {
        email: parsedEnv.ADMIN_SEED_EMAIL,
        password: parsedEnv.ADMIN_SEED_PASSWORD,
      },
      session: {
        maxAgeSeconds: parsedEnv.SESSION_MAX_AGE_SECONDS,
        secret: parsedEnv.SESSION_SECRET,
      },
    },
    cron: {
      secret: parsedEnv.CRON_SECRET,
    },
    database: {
      url: parsedEnv.DATABASE_URL,
    },
    destinations: {
      encryptionKey: parsedEnv.DESTINATION_TOKEN_ENCRYPTION_KEY,
    },
    meta: {
      allowedPageIds: parsedEnv.META_ALLOWED_PAGE_IDS || [],
      app: {
        id: parsedEnv.META_APP_ID || null,
        secret: parsedEnv.META_APP_SECRET || null,
      },
      destinationCredentials: parsedEnv.META_DESTINATION_CREDENTIALS_JSON || {},
      graphApiBaseUrl: parsedEnv.META_GRAPH_API_BASE_URL || "https://graph.facebook.com/v25.0",
      socialGuardrails: {
        facebookMaxPostsPer24Hours: parsedEnv.META_FACEBOOK_MAX_POSTS_PER_24H || 12,
        instagramMaxHashtags: parsedEnv.META_INSTAGRAM_MAX_HASHTAGS || 8,
        instagramMaxPostsPer24Hours: parsedEnv.META_INSTAGRAM_MAX_POSTS_PER_24H || 20,
        minPostIntervalMinutes: parsedEnv.META_SOCIAL_MIN_POST_INTERVAL_MINUTES || 90,
        duplicateCooldownHours: parsedEnv.META_SOCIAL_DUPLICATE_COOLDOWN_HOURS || 72,
      },
      userAccessToken: parsedEnv.META_USER_ACCESS_TOKEN || null,
    },
    media: {
      driver: parsedEnv.MEDIA_DRIVER,
      local: {
        basePath: parsedEnv.LOCAL_MEDIA_BASE_PATH || null,
        baseUrl: parsedEnv.LOCAL_MEDIA_BASE_URL || null,
      },
      maxRemoteFileBytes: parsedEnv.MEDIA_MAX_REMOTE_FILE_BYTES,
      s3: {
        accessKeyId: parsedEnv.S3_ACCESS_KEY_ID || null,
        baseUrl: parsedEnv.S3_MEDIA_BASE_URL || null,
        bucket: parsedEnv.S3_MEDIA_BUCKET || null,
        region: parsedEnv.S3_MEDIA_REGION || null,
        secretAccessKey: parsedEnv.S3_SECRET_ACCESS_KEY || null,
      },
      uploadAllowedMimeTypes: parsedEnv.UPLOAD_ALLOWED_MIME_TYPES,
    },
    observability: {
      analyticsEnabled: parsedEnv.ENABLE_ANALYTICS,
      metricsEnabled: parsedEnv.ENABLE_METRICS,
    },
    providers: {
      credentials: {
        mediastack: parsedEnv.MEDIASTACK_API_KEY || null,
        newsapi: parsedEnv.NEWSAPI_API_KEY || null,
        newsdata: parsedEnv.NEWSDATA_API_KEY || null,
      },
    },
    revalidate: {
      secret: parsedEnv.REVALIDATE_SECRET,
    },
    scheduler: {
      defaultTimezone: parsedEnv.DEFAULT_SCHEDULE_TIMEZONE,
      initialBackfillHours: parsedEnv.INITIAL_BACKFILL_HOURS,
    },
  };
}

export function formatEnvValidationError(error) {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "environment";

    if (issue.code === "invalid_type" && issue.input === undefined) {
      return `- ${path}: ${path} is required.`;
    }

    return `- ${path}: ${issue.message}`;
  });

  return [
    "Invalid environment configuration.",
    ...lines,
    "Update your env file to match .env.example before starting the app.",
  ].join("\n");
}

export function parseSharedEnv(rawEnv) {
  const result = sharedEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    throw new Error(formatEnvValidationError(result.error));
  }

  return mapSharedEnv(result.data);
}

export function parseServerEnv(rawEnv) {
  const result = serverEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    throw new Error(formatEnvValidationError(result.error));
  }

  return mapServerEnv(result.data);
}
