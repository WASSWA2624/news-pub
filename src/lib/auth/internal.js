import crypto from "node:crypto";

function extractBearerToken(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = trimmedValue.slice(7).trim();

  return token || null;
}

function areSecretsEqual(providedSecret, expectedSecret) {
  if (typeof providedSecret !== "string" || typeof expectedSecret !== "string") {
    return false;
  }

  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function hasRequestSecret(
  request,
  expectedSecret,
  { allowAuthorizationBearer = true, headerNames = [] } = {},
) {
  if (!expectedSecret) {
    return false;
  }

  const candidateSecrets = [];

  if (allowAuthorizationBearer) {
    const authorizationToken = extractBearerToken(request.headers.get("authorization"));

    if (authorizationToken) {
      candidateSecrets.push(authorizationToken);
    }
  }

  for (const headerName of headerNames) {
    const headerValue = request.headers.get(headerName);

    if (typeof headerValue === "string" && headerValue.trim()) {
      candidateSecrets.push(headerValue.trim());
    }
  }

  return candidateSecrets.some((candidateSecret) => areSecretsEqual(candidateSecret, expectedSecret));
}
