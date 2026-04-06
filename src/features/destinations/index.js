import { createAuditEventRecord } from "@/lib/analytics";
import { isDestinationRuntimeReady, resolveDestinationRuntimeConnection } from "@/lib/news/destination-runtime";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { decryptSecretValue, encryptSecretValue } from "@/lib/security/secrets";
import { getDestinationValidationIssues } from "@/lib/validation/configuration";

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
        effectiveConnectionStatus: runtimeConnection.effectiveConnectionStatus,
        hasRuntimeCredentials: runtimeConnection.hasRuntimeCredentials,
        hasStoredToken: Boolean(destination.encryptedTokenCiphertext),
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

  const nextToken = trimText(input.token);
  const encryptedToken = nextToken ? encryptSecretValue(nextToken) : null;
  const destination = await db.destination.upsert({
    where: {
      slug,
    },
    update: {
      accountHandle: trimText(input.accountHandle) || null,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext:
        nextToken || input.clearToken ? encryptedToken?.ciphertext || null : undefined,
      encryptedTokenIv: nextToken || input.clearToken ? encryptedToken?.iv || null : undefined,
      encryptedTokenTag: nextToken || input.clearToken ? encryptedToken?.tag || null : undefined,
      externalAccountId: trimText(input.externalAccountId) || null,
      kind,
      lastConnectedAt:
        trimText(input.connectionStatus) === "CONNECTED" ? new Date() : input.lastConnectedAt || null,
      name,
      platform,
      settingsJson: input.settingsJson || {},
      tokenHint: nextToken ? createTokenHint(nextToken) : input.clearToken ? null : undefined,
    },
    create: {
      accountHandle: trimText(input.accountHandle) || null,
      connectionError: trimText(input.connectionError) || null,
      connectionStatus: trimText(input.connectionStatus) || "DISCONNECTED",
      encryptedTokenCiphertext: encryptedToken?.ciphertext || null,
      encryptedTokenIv: encryptedToken?.iv || null,
      encryptedTokenTag: encryptedToken?.tag || null,
      externalAccountId: trimText(input.externalAccountId) || null,
      kind,
      lastConnectedAt: trimText(input.connectionStatus) === "CONNECTED" ? new Date() : null,
      name,
      platform,
      settingsJson: input.settingsJson || {},
      slug,
      tokenHint: createTokenHint(nextToken),
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
      },
    },
    db,
  );

  return destination;
}
