import { z } from "zod";

import { defaultLocale, supportedLocales } from "@/features/i18n/config";

export const generationArticleDepthValues = Object.freeze([
  "fast",
  "complete",
  "repair",
  "maintenance",
]);

export const generationTargetAudienceValues = Object.freeze([
  "students",
  "nurses",
  "doctors",
  "medical_workers",
  "technicians",
  "engineers",
  "hospital_owners",
  "administrators",
  "procurement_teams",
  "trainers",
  "biomedical_staff",
]);

export const generationRequestDefaults = Object.freeze({
  articleDepth: "complete",
  includeFaults: true,
  includeImages: true,
  includeManualLinks: true,
  includeManufacturers: true,
  includeModels: true,
  locale: defaultLocale,
  replaceExistingPost: false,
  schedulePublishAt: null,
  targetAudience: Object.freeze([...generationTargetAudienceValues]),
});

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function createRequiredStringSchema(fieldName) {
  return z.string().trim().min(1, {
    message: `${fieldName} is required.`,
  });
}

function createEnumStringSchema(fieldName, values) {
  const allowedValues = new Set(values);

  return createRequiredStringSchema(fieldName).refine((value) => allowedValues.has(value), {
    message: `${fieldName} must be one of: ${values.join(", ")}.`,
  });
}

function normalizeNullableSchedule(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue ? trimmedValue : null;
  }

  return value;
}

const generationLocaleSchema = createEnumStringSchema("locale", supportedLocales).default(
  defaultLocale,
);

const generationArticleDepthSchema = createEnumStringSchema(
  "articleDepth",
  generationArticleDepthValues,
).default(generationRequestDefaults.articleDepth);

const generationTargetAudienceItemSchema = createEnumStringSchema(
  "targetAudience",
  generationTargetAudienceValues,
);

const schedulePublishAtSchema = z.preprocess(
  normalizeNullableSchedule,
  z
    .union([
      z.null(),
      z.string().refine((value) => isoDateTimePattern.test(value), {
        message: "schedulePublishAt must be a valid ISO datetime.",
      }),
    ])
    .default(generationRequestDefaults.schedulePublishAt),
);

export function createGenerationRequestSchema(
  { duplicateDetected = false, now = new Date() } = {},
) {
  return z
    .object({
      articleDepth: generationArticleDepthSchema,
      equipmentName: createRequiredStringSchema("equipmentName"),
      includeFaults: z.boolean().default(generationRequestDefaults.includeFaults),
      includeImages: z.boolean().default(generationRequestDefaults.includeImages),
      includeManualLinks: z.boolean().default(generationRequestDefaults.includeManualLinks),
      includeManufacturers: z.boolean().default(generationRequestDefaults.includeManufacturers),
      includeModels: z.boolean().default(generationRequestDefaults.includeModels),
      locale: generationLocaleSchema,
      providerConfigId: createRequiredStringSchema("providerConfigId"),
      replaceExistingPost: z.boolean().default(generationRequestDefaults.replaceExistingPost),
      schedulePublishAt: schedulePublishAtSchema,
      targetAudience: z
        .array(generationTargetAudienceItemSchema)
        .min(1, {
          message: "targetAudience must include at least one audience.",
        })
        .default([...generationRequestDefaults.targetAudience]),
    })
    .strict()
    .superRefine((value, context) => {
      const seenAudiences = new Set();

      for (const audience of value.targetAudience) {
        if (seenAudiences.has(audience)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetAudience"],
            message: "targetAudience must not contain duplicates.",
          });
          break;
        }

        seenAudiences.add(audience);
      }

      if (value.schedulePublishAt) {
        const scheduledDate = new Date(value.schedulePublishAt);

        if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= now.getTime()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schedulePublishAt"],
            message: "schedulePublishAt must be in the future.",
          });
        }
      }

      if (value.replaceExistingPost && !duplicateDetected) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["replaceExistingPost"],
          message: "replaceExistingPost may only be true after duplicate detection.",
        });
      }
    });
}

export const generationRequestSchema = createGenerationRequestSchema();

export function parseGenerationRequest(input, options) {
  return createGenerationRequestSchema(options).parse(input);
}

export function safeParseGenerationRequest(input, options) {
  return createGenerationRequestSchema(options).safeParse(input);
}
