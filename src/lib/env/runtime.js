import { z } from "zod";

import { supportedAiProviderValues } from "@/lib/ai/provider-registry";

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
    AI_PROVIDER_DEFAULT: optionalString(),
    AI_MODEL_DEFAULT: optionalString(),
    AI_PROVIDER_FALLBACK: optionalString(),
    AI_MODEL_FALLBACK: optionalString(),
    AI_PROVIDER_CONFIG_SECRET: optionalString(),
    OPENAI_API_KEY: optionalString(),
    MEDIA_DRIVER: requiredString("MEDIA_DRIVER"),
    LOCAL_MEDIA_BASE_PATH: optionalString(),
    LOCAL_MEDIA_BASE_URL: optionalString(),
    S3_MEDIA_BUCKET: optionalString(),
    S3_MEDIA_REGION: optionalString(),
    S3_MEDIA_BASE_URL: optionalUrlString("S3_MEDIA_BASE_URL"),
    S3_ACCESS_KEY_ID: optionalString(),
    S3_SECRET_ACCESS_KEY: optionalString(),
    ADMIN_SEED_EMAIL: requiredString("ADMIN_SEED_EMAIL").email({
      message: "ADMIN_SEED_EMAIL must be a valid email address.",
    }),
    ADMIN_SEED_PASSWORD: requiredString("ADMIN_SEED_PASSWORD"),
    COMMENT_RATE_LIMIT_WINDOW_MS: integerString("COMMENT_RATE_LIMIT_WINDOW_MS"),
    COMMENT_RATE_LIMIT_MAX: integerString("COMMENT_RATE_LIMIT_MAX"),
    COMMENT_CAPTCHA_ENABLED: booleanString("COMMENT_CAPTCHA_ENABLED"),
    COMMENT_CAPTCHA_SECRET: optionalString(),
    UPLOAD_ALLOWED_MIME_TYPES: csvString("UPLOAD_ALLOWED_MIME_TYPES"),
    REVALIDATE_SECRET: requiredString("REVALIDATE_SECRET"),
    CRON_SECRET: requiredString("CRON_SECRET"),
  })
  .superRefine((env, context) => {
    const supportedProviders = [...supportedAiProviderValues];
    const supportedMediaDrivers = ["local", "s3"];

    if ((env.AI_PROVIDER_DEFAULT && !env.AI_MODEL_DEFAULT) || (!env.AI_PROVIDER_DEFAULT && env.AI_MODEL_DEFAULT)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_PROVIDER_DEFAULT"],
        message: "AI_PROVIDER_DEFAULT and AI_MODEL_DEFAULT must be set together when bootstrapping provider defaults.",
      });
    }

    if (
      (env.AI_PROVIDER_FALLBACK && !env.AI_MODEL_FALLBACK) ||
      (!env.AI_PROVIDER_FALLBACK && env.AI_MODEL_FALLBACK)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_PROVIDER_FALLBACK"],
        message:
          "AI_PROVIDER_FALLBACK and AI_MODEL_FALLBACK must be set together when bootstrapping fallback providers.",
      });
    }

    if (env.AI_PROVIDER_DEFAULT && !supportedProviders.includes(env.AI_PROVIDER_DEFAULT)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_PROVIDER_DEFAULT"],
        message: `AI_PROVIDER_DEFAULT must be one of: ${supportedProviders.join(", ")}.`,
      });
    }

    if (env.AI_PROVIDER_FALLBACK && !supportedProviders.includes(env.AI_PROVIDER_FALLBACK)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_PROVIDER_FALLBACK"],
        message: `AI_PROVIDER_FALLBACK must be one of: ${supportedProviders.join(", ")}.`,
      });
    }

    if (!supportedMediaDrivers.includes(env.MEDIA_DRIVER)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEDIA_DRIVER"],
        message: `MEDIA_DRIVER must be one of: ${supportedMediaDrivers.join(", ")}.`,
      });
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

    if (env.COMMENT_CAPTCHA_ENABLED && !env.COMMENT_CAPTCHA_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COMMENT_CAPTCHA_SECRET"],
        message: "COMMENT_CAPTCHA_SECRET is required when COMMENT_CAPTCHA_ENABLED=true.",
      });
    }
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
    ai: {
      default:
        parsedEnv.AI_PROVIDER_DEFAULT && parsedEnv.AI_MODEL_DEFAULT
          ? {
              provider: parsedEnv.AI_PROVIDER_DEFAULT,
              model: parsedEnv.AI_MODEL_DEFAULT,
            }
          : null,
      fallback:
        parsedEnv.AI_PROVIDER_FALLBACK && parsedEnv.AI_MODEL_FALLBACK
          ? {
              provider: parsedEnv.AI_PROVIDER_FALLBACK,
              model: parsedEnv.AI_MODEL_FALLBACK,
            }
          : null,
      openaiApiKey: parsedEnv.OPENAI_API_KEY || null,
      providerConfigSecret: parsedEnv.AI_PROVIDER_CONFIG_SECRET || parsedEnv.SESSION_SECRET,
    },
    auth: {
      session: {
        maxAgeSeconds: parsedEnv.SESSION_MAX_AGE_SECONDS,
        secret: parsedEnv.SESSION_SECRET,
      },
      adminSeed: {
        email: parsedEnv.ADMIN_SEED_EMAIL,
        password: parsedEnv.ADMIN_SEED_PASSWORD,
      },
    },
    comments: {
      captcha: {
        enabled: parsedEnv.COMMENT_CAPTCHA_ENABLED,
        secret: parsedEnv.COMMENT_CAPTCHA_SECRET || null,
      },
      rateLimit: {
        max: parsedEnv.COMMENT_RATE_LIMIT_MAX,
        windowMs: parsedEnv.COMMENT_RATE_LIMIT_WINDOW_MS,
      },
    },
    cron: {
      secret: parsedEnv.CRON_SECRET,
    },
    database: {
      url: parsedEnv.DATABASE_URL,
    },
    media: {
      driver: parsedEnv.MEDIA_DRIVER,
      local: {
        basePath: parsedEnv.LOCAL_MEDIA_BASE_PATH || null,
        baseUrl: parsedEnv.LOCAL_MEDIA_BASE_URL || null,
      },
      s3: {
        accessKeyId: parsedEnv.S3_ACCESS_KEY_ID || null,
        baseUrl: parsedEnv.S3_MEDIA_BASE_URL || null,
        bucket: parsedEnv.S3_MEDIA_BUCKET || null,
        region: parsedEnv.S3_MEDIA_REGION || null,
        secretAccessKey: parsedEnv.S3_SECRET_ACCESS_KEY || null,
      },
      uploadAllowedMimeTypes: parsedEnv.UPLOAD_ALLOWED_MIME_TYPES,
    },
    revalidate: {
      secret: parsedEnv.REVALIDATE_SECRET,
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
