import { resolvePrismaClient } from "@/lib/news/shared";
import { env } from "@/lib/env/server";

export async function getSettingsSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [locales, providerCount, destinationCount, streamCount] = await Promise.all([
    db.locale.findMany({
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    }),
    db.newsProviderConfig.count(),
    db.destination.count(),
    db.publishingStream.count(),
  ]);

  return {
    locales,
    scheduler: env.scheduler,
    storage: {
      driver: env.media.driver,
      maxRemoteFileBytes: env.media.maxRemoteFileBytes,
      uploadAllowedMimeTypes: env.media.uploadAllowedMimeTypes,
    },
    summary: {
      destinationCount,
      providerCount,
      streamCount,
    },
    toggles: env.observability,
  };
}
