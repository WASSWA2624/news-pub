import { z } from "zod";

export const commentModerationStatusValues = Object.freeze([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SPAM",
]);

export const commentBodyMaxLength = 3000;
export const commentNameMaxLength = 191;
export const commentEmailMaxLength = 191;
export const commentModerationNotesMaxLength = 1000;

function createRequiredStringSchema(fieldName) {
  return z.string().trim().min(1, {
    message: `${fieldName} is required.`,
  });
}

function createOptionalStringSchema() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      return trimmedValue ? trimmedValue : undefined;
    }

    return value;
  }, z.string().trim().optional());
}

function createOptionalLengthLimitedStringSchema(maxLength, fieldName) {
  return createOptionalStringSchema().pipe(
    z.string().trim().max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters.`,
    }).optional(),
  );
}

function createEnumStringSchema(fieldName, values) {
  const allowedValues = new Set(values);

  return createRequiredStringSchema(fieldName).refine((value) => allowedValues.has(value), {
    message: `${fieldName} must be one of: ${values.join(", ")}.`,
  });
}

export const commentSubmissionSchema = z
  .object({
    body: createRequiredStringSchema("body").max(commentBodyMaxLength, {
      message: `body must be at most ${commentBodyMaxLength} characters.`,
    }),
    captchaAnswer: createOptionalStringSchema(),
    captchaToken: createOptionalStringSchema(),
    email: z.preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      if (typeof value === "string") {
        const trimmedValue = value.trim();

        return trimmedValue ? trimmedValue : undefined;
      }

      return value;
    }, z.string().trim().max(commentEmailMaxLength, {
      message: `email must be at most ${commentEmailMaxLength} characters.`,
    }).email({ message: "email must be a valid email address." }).optional()),
    name: createRequiredStringSchema("name").max(commentNameMaxLength, {
      message: `name must be at most ${commentNameMaxLength} characters.`,
    }),
    parentId: createOptionalStringSchema(),
    postId: createRequiredStringSchema("postId"),
  })
  .strict();

export const commentModerationUpdateSchema = z
  .object({
    moderationStatus: createEnumStringSchema(
      "moderationStatus",
      commentModerationStatusValues,
    ),
    notes: createOptionalLengthLimitedStringSchema(
      commentModerationNotesMaxLength,
      "notes",
    ),
  })
  .strict();

export const commentDeletionSchema = z
  .object({
    notes: createOptionalLengthLimitedStringSchema(
      commentModerationNotesMaxLength,
      "notes",
    ),
  })
  .strict();
