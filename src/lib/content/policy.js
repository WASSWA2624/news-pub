import { env } from "@/lib/env/server";
import { dedupeStrings, normalizeSearchText, trimText } from "@/lib/news/shared";

function countWords(value) {
  return trimText(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeHashtags(value) {
  if (Array.isArray(value)) {
    return dedupeStrings(value.map((entry) => `${entry}`.replace(/^#+/, ""))).map((entry) => `#${entry}`);
  }

  return dedupeStrings(
    trimText(value)
      .split(/\s+/)
      .filter((token) => token.startsWith("#"))
      .map((token) => token.replace(/^#+/, "")),
  ).map((entry) => `#${entry}`);
}

function createReason(code, message, severity = "warning") {
  return {
    code,
    message,
    severity,
  };
}

function hasRepeatedFormatting(value) {
  const normalizedValue = trimText(value);

  return /!{3,}|\?{3,}|([A-Z]{4,}\s+){3,}/.test(normalizedValue);
}

function getEngagementBaitMatches(value) {
  const normalizedValue = normalizeSearchText(value);
  const patterns = [
    ["engagement_bait_comment", "comment below"],
    ["engagement_bait_share", "share this"],
    ["engagement_bait_tag", "tag a friend"],
    ["engagement_bait_click", "click here"],
    ["engagement_bait_believe", "you won't believe"],
  ];

  return patterns
    .filter(([, phrase]) => normalizedValue.includes(phrase))
    .map(([code, phrase]) =>
      createReason(code, `The copy contains a risky engagement-bait phrase: "${phrase}".`),
    );
}

function buildReadinessCheck(label, passed, detail) {
  return {
    detail: trimText(detail) || null,
    label,
    passed,
  };
}

/**
 * Applies lightweight platform safety and readiness heuristics to one
 * destination-specific payload before review or publication.
 */
export function evaluateDestinationPolicy({
  destination = {},
  mediaValidation = null,
  payload = {},
  platform = "",
} = {}) {
  const resolvedPlatform = trimText(platform || destination.platform).toUpperCase();
  const title = trimText(payload.title);
  const body = trimText(payload.body || payload.caption || payload.summary);
  const sourceAttribution = trimText(payload.sourceAttribution || payload.sourceReference);
  const hashtags = normalizeHashtags(payload.hashtags);
  const normalizedBody = normalizeSearchText([title, body, sourceAttribution].join(" "));
  const blocklist = dedupeStrings(env.policy.blocklist || []).map((value) => normalizeSearchText(value));
  const reasons = [];
  const warnings = [];
  let riskScore = 0;

  for (const blockedPhrase of blocklist) {
    if (blockedPhrase && normalizedBody.includes(blockedPhrase)) {
      reasons.push(
        createReason(
          "policy_blocklist_phrase",
          `The content matches the blocked phrase "${blockedPhrase}".`,
          "error",
        ),
      );
      riskScore = 100;
      break;
    }
  }

  warnings.push(...getEngagementBaitMatches([title, body].join(" ")));
  riskScore += warnings.length * 12;

  if (hasRepeatedFormatting([title, body].join(" "))) {
    warnings.push(
      createReason(
        "formatting_aggressive",
        "The copy uses repeated punctuation or all-caps formatting that could look spammy.",
      ),
    );
    riskScore += 12;
  }

  if (!sourceAttribution) {
    reasons.push(
      createReason(
        "source_attribution_missing",
        "Source attribution is required before this post can move forward.",
        "error",
      ),
    );
    riskScore = Math.max(riskScore, 60);
  }

  if (hashtags.length !== dedupeStrings(hashtags).length) {
    warnings.push(
      createReason("hashtags_duplicated", "Duplicate hashtags were detected and should be removed."),
    );
    riskScore += 8;
  }

  if (resolvedPlatform === "FACEBOOK") {
    const titleWordCount = countWords(title);
    const bodyWordCount = countWords(body);

    if (titleWordCount > 10) {
      warnings.push(
        createReason("facebook_title_too_long", "Facebook titles should stay within 10 words."),
      );
      riskScore += 8;
    }

    if (bodyWordCount < 20 || bodyWordCount > 100) {
      warnings.push(
        createReason(
          "facebook_body_word_limit",
          "Facebook body copy should stay between 20 and 100 words.",
        ),
      );
      riskScore += 12;
    }
  }

  if (resolvedPlatform === "WEBSITE") {
    const titleWordCount = countWords(title);
    const bodyWordCount = countWords(body);

    if (titleWordCount >= 15) {
      warnings.push(
        createReason("website_title_too_long", "Website titles should stay under 15 words."),
      );
      riskScore += 8;
    }

    if (bodyWordCount < 100 || bodyWordCount > 500) {
      warnings.push(
        createReason(
          "website_body_word_limit",
          "Website body copy should stay between 100 and 500 words when source material allows it.",
        ),
      );
      riskScore += 8;
    }
  }

  if (resolvedPlatform === "INSTAGRAM") {
    if (!payload.mediaUrl) {
      reasons.push(
        createReason(
          "instagram_media_required",
          "Instagram posts need a valid media asset and should be held for review when one is unavailable.",
          "warning",
        ),
      );
      riskScore = Math.max(riskScore, 55);
    }

    if (hashtags.length > env.meta.socialGuardrails.instagramMaxHashtags) {
      warnings.push(
        createReason(
          "instagram_hashtag_limit",
          `Instagram hashtags should stay within ${env.meta.socialGuardrails.instagramMaxHashtags}.`,
        ),
      );
      riskScore += 10;
    }
  }

  if (mediaValidation && !mediaValidation.ok) {
    reasons.push(
      createReason(
        "media_validation_failed",
        mediaValidation.message || "The selected media failed validation.",
        "warning",
      ),
    );
    riskScore = Math.max(riskScore, resolvedPlatform === "INSTAGRAM" ? 60 : 45);
  }

  const status =
    reasons.some((reason) => reason.severity === "error") || riskScore >= env.policy.blockScore
      ? "BLOCK"
      : reasons.length || riskScore >= env.policy.holdScore
        ? "HOLD"
        : "PASS";

  return {
    readinessChecks: [
      buildReadinessCheck("Source attribution", Boolean(sourceAttribution), sourceAttribution || "Required"),
      buildReadinessCheck(
        "Media validation",
        !mediaValidation || mediaValidation.ok,
        mediaValidation?.ok ? mediaValidation.url : mediaValidation?.message,
      ),
      buildReadinessCheck(
        "Hashtag hygiene",
        hashtags.length <= env.meta.socialGuardrails.instagramMaxHashtags,
        hashtags.join(" ") || "No hashtags",
      ),
    ],
    reasons,
    riskScore: Math.min(100, riskScore),
    status,
    warnings,
  };
}
