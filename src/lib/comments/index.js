import crypto from "node:crypto";

import { normalizeDisplayText } from "@/lib/normalization";

export const commentDuplicateLookbackMs = 6 * 60 * 60 * 1000;
export const commentCaptchaTtlMs = 30 * 60 * 1000;
export const commentReplyDepthLimit = 1;
export const commentMaxLinkCount = 2;

const accentPattern = /[\u0300-\u036f]/g;
const commentProfanityTerms = Object.freeze([
  "asshole",
  "bastard",
  "bitch",
  "bullshit",
  "fuck",
  "motherfucker",
  "shit",
]);
const spamPhrasePatterns = [
  /\bbuy now\b/i,
  /\bcheap\b/i,
  /\bdiscount\b/i,
  /\bfree money\b/i,
  /\bseo service\b/i,
  /\btelegram\b/i,
  /\bwhatsapp\b/i,
];

function normalizeMatchingText(value) {
  const normalized = normalizeDisplayText(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .normalize("NFKD")
    .replace(accentPattern, "")
    .toLowerCase();
}

function createHmacDigest(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createCommentPreview(value, maxLength = 160) {
  const normalized = normalizeDisplayText(value);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export function hashCommentValue(value, secret, scope = "comment") {
  return crypto
    .createHash("sha256")
    .update(`${scope}:${secret}:${normalizeDisplayText(value) || "unknown"}`)
    .digest("hex");
}

export function extractRequestIp(request) {
  const forwardedFor = request?.headers?.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request?.headers?.get("cf-connecting-ip") ||
    request?.headers?.get("x-real-ip") ||
    "unknown"
  );
}

export function extractRequestUserAgent(request) {
  return normalizeDisplayText(request?.headers?.get("user-agent")) || null;
}

export function isDuplicateComment(candidate, existingComment) {
  return normalizeMatchingText(candidate?.body) === normalizeMatchingText(existingComment?.body);
}

export function containsProfanity(values = []) {
  const normalizedValues = values.map((value) => normalizeMatchingText(value)).filter(Boolean);

  return normalizedValues.some((value) =>
    commentProfanityTerms.some((term) =>
      new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, "i").test(value),
    ),
  );
}

export function detectSpamSignals({ body, email, name }) {
  const reasons = [];
  const normalizedBody = normalizeMatchingText(body);
  const normalizedName = normalizeMatchingText(name);
  const linkMatches = `${body || ""}`.match(/(?:https?:\/\/|www\.)/gi) || [];

  if (linkMatches.length > commentMaxLinkCount) {
    reasons.push("excessive_links");
  }

  if (
    spamPhrasePatterns.some((pattern) => pattern.test(normalizedBody)) ||
    /(?:https?:\/\/|www\.)/.test(normalizedName)
  ) {
    reasons.push("promotional_or_url_identity");
  }

  if (/(.)\1{7,}/i.test(normalizedBody) || /[!?]{6,}/.test(body || "")) {
    reasons.push("repetitive_pattern");
  }

  if ((body || "").replace(/[^A-Z]/g, "").length >= 24) {
    reasons.push("excessive_uppercase");
  }

  if (email && /(mailinator|tempmail|10minutemail)/i.test(email)) {
    reasons.push("disposable_email");
  }

  return [...new Set(reasons)];
}

export function buildCommentCaptchaChallenge(secret, now = new Date()) {
  const firstNumber = crypto.randomInt(2, 10);
  const secondNumber = crypto.randomInt(1, 10);
  const issuedAt = now.toISOString();
  const nonce = crypto.randomBytes(12).toString("base64url");
  const signature = createHmacDigest(
    `${firstNumber}:${secondNumber}:${nonce}:${issuedAt}`,
    secret,
  );

  return {
    expiresAt: new Date(now.getTime() + commentCaptchaTtlMs).toISOString(),
    prompt: `What is ${firstNumber} + ${secondNumber}?`,
    token: Buffer.from(
      JSON.stringify({
        firstNumber,
        issuedAt,
        nonce,
        secondNumber,
        signature,
      }),
    ).toString("base64url"),
  };
}

export function verifyCommentCaptchaChallenge({ answer, now = new Date(), secret, token }) {
  const normalizedAnswer = normalizeDisplayText(answer);

  if (!normalizedAnswer || !token) {
    return {
      reason: "missing_captcha_response",
      success: false,
    };
  }

  let parsedToken;

  try {
    parsedToken = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return {
      reason: "invalid_captcha_token",
      success: false,
    };
  }

  const issuedAt = new Date(parsedToken?.issuedAt || "");

  if (
    !Number.isInteger(parsedToken?.firstNumber) ||
    !Number.isInteger(parsedToken?.secondNumber) ||
    !parsedToken?.nonce ||
    !(issuedAt instanceof Date) ||
    Number.isNaN(issuedAt.getTime())
  ) {
    return {
      reason: "invalid_captcha_token",
      success: false,
    };
  }

  const expectedSignature = createHmacDigest(
    `${parsedToken.firstNumber}:${parsedToken.secondNumber}:${parsedToken.nonce}:${parsedToken.issuedAt}`,
    secret,
  );

  if (!timingSafeEqual(expectedSignature, parsedToken.signature || "")) {
    return {
      reason: "invalid_captcha_token",
      success: false,
    };
  }

  if (now.getTime() - issuedAt.getTime() > commentCaptchaTtlMs) {
    return {
      reason: "expired_captcha_token",
      success: false,
    };
  }

  const expectedAnswer = `${parsedToken.firstNumber + parsedToken.secondNumber}`;

  if (normalizedAnswer !== expectedAnswer) {
    return {
      reason: "incorrect_captcha_answer",
      success: false,
    };
  }

  return {
    success: true,
  };
}
