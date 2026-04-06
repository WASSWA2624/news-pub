import { createAuditEventRecord } from "@/lib/analytics";
import { isDestinationRuntimeReady, resolveDestinationRuntimeConnection } from "@/lib/news/destination-runtime";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { decryptSecretValue, encryptSecretValue } from "@/lib/security/secrets";
import { getDestinationValidationIssues } from "@/lib/validation/configuration";
import {
  getDestinationSocialGuardrailOverrideFields,
  getDestinationSocialGuardrails,
  resolveMetaDiscoverySelection,
  buildDestinationSettingsPayload,
  usesDestinationCredentialOverrides,
} from "./meta-config";

function createTokenHint(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(-4);
}

export async function getDestinationManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const destinations = await db.destination.findMany({
    include: {
      streams: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
  });

  return {
    destinations: destinations.map((destination) => {
      const runtimeConnection = resolveDestinationRuntimeConnection(destination);

      return {
        ...destination,
        effectiveSocialGuardrails: getDestinationSocialGuardrails(destination),
        effectiveConnectionStatus: runtimeConnection.effectiveConnectionStatus,
        hasRuntimeCredentials: runtimeConnection.hasRuntimeCredentials,
        socialGuardrailOverrides: getDestinationSocialGuardrailOverrideFields(destination),
        hasStoredToken: Boolean(destination.encryptedTokenCiphertext),
        usesDestinationCredentialOverrides: usesDestinationCredentialOverrides(destination),
        usesRuntimeCredentials: runtimeConnection.usesEnvCredentials,
        validationIssues: getDestinationValidationIssues(destination),
        storedTokenPreview: destination.encryptedTokenCiphertext
          ? decryptSecretValue({
              ciphertext: destination.encryptedTokenCiphertext,
              iv: destination.encryptedTokenIv,
              tag: destination.encryptedTokenTag,
            })?.slice(0, 0) ?? true
          : false,
      };
    }),
    summary: {
      connectedCount: destinations.filter((destination) => isDestinationRuntimeReady(destination)).length,
      errorCount: destinations.filter((destination) => destination.connectionStatus === "ERROR").length,
      totalCount: destinations.length,
    },
  };
}

export async function saveDestinationRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const slug = trimText(input.slug);
  const name = trimText(input.name);
  const platform = trimText(input.platform).toUpperCase();
  const kind = trimText(input.kind).toUpperCase();

  if (!slug || !name || !platform || !kind) {
    throw new NewsPubError("Destination name, slug, platform, and kind are required.", {
      status: "destination_validation_failed",
      statusCode: 400,
    });
  }

  const validationIssues = getDestinationValidationIssues({
    kind,
    platform,
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "destination_validation_failed",
      statusCode: 400,
    });
  }

  const resolvedSelection = await resolveMetaDiscoverySelection({
    sourceKey: input.metaDiscoverySourceKey,
    targetId: input.metaDiscoveryTargetId,
    targetType: input.metaDiscoveryTargetType,
  });
  const inputSettingsJson =
    input.settingsJson && typeof input.settingsJson === "object" && !Array.isArray(input.settingsJson)
      ? input.settingsJson
      : {};
  const nextSettingsJson = buildDestinationSettingsPayload({
    advancedSettings: inputSettingsJson,
    graphApiBaseUrl: input.graphApiBaseUrl,
    instagramUserId: input.instagramUserId || resolvedSelection?.settingsJsonPatch?.instagramUserId,
    kind,
    pageId: input.pageId || resolvedSelection?.settingsJsonPatch?.pageId,
    profileId: input.profileId,
    socialGuardrails: input.socialGuardrails,
    useDestinationCredentialOverrides: inputSettingsJson.useDestinationCredentialOverrides === true,
  });
  const nextToken = trimText(input.token);
  const discoveredToken = !nextToken && !input.clearToken ? trimText(resolvedSelection?.accessToken) : "";
  const tokenToEncrypt = nextToken || discoveredToken;
  const encryptedToken = tokenToEncrypt ? encryptSecretValue(tokenToEncrypt) : null;
  const nextExternalAccountId =
    trimText(input.externalAccountId) || trimText(resolvedSelection?.externalAccountId) || null;
  const nextAccountHandle =
    trimText(input.accountHandle) || trimText(resolvedSelection?.accountHandle) || null;
  const shouldPersistToken = Boolean(nextToken || discoveredToken || input.clearToken);
  const destination = await db.destination.upsert({
    where: {
      slug,
    },
    update: {
      accountHandle: nextAccountHandle,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext: shouldPersistToken ? encryptedToken?.ciphertext || null : undefined,
      encryptedTokenIv: shouldPersistToken ? encryptedToken?.iv || null : undefined,
      encryptedTokenTag: shouldPersistToken ? encryptedToken?.tag || null : undefined,
      externalAccountId: nextExternalAccountId,
      kind,
      lastConnectedAt:
        trimText(input.connectionStatus) === "CONNECTED" ? new Date() : input.lastConnectedAt || null,
      name,
      platform,
      settingsJson: nextSettingsJson,
      tokenHint: tokenToEncrypt ? createTokenHint(tokenToEncrypt) : input.clearToken ? null : undefined,
    },
    create: {
      accountHandle: nextAccountHandle,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext: encryptedToken?.ciphertext || null,
      encryptedTokenIv: encryptedToken?.iv || null,
      encryptedTokenTag: encryptedToken?.tag || null,
      externalAccountId: nextExternalAccountId,
      kind,
      lastConnectedAt: trimText(input.connectionStatus) === "CONNECTED" ? new Date() : null,
      name,
      platform,
      settingsJson: nextSettingsJson,
      slug,
      tokenHint: createTokenHint(tokenToEncrypt),
    },
  });

  await createAuditEventRecord(
    {
      action: "DESTINATION_SAVED",
      actorId,
      entityId: destination.id,
      entityType: "destination",
      payloadJson: {
        connectionStatus: destination.connectionStatus,
        kind: destination.kind,
        platform: destination.platform,
        socialGuardrailOverrides: getDestinationSocialGuardrailOverrideFields(destination),
        usesDestinationCredentialOverrides: usesDestinationCredentialOverrides(destination),
      },
    },
    db,
  );

  return destination;
}
