import { resolvePrismaClient } from "@/lib/news/shared";
import { env } from "@/lib/env/server";
import { getConfigurationIssues } from "@/lib/validation/configuration";

export async function getSettingsSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [locales, providerCount, destinations, streams, templates] = await Promise.all([
    db.locale.findMany({
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    }),
    db.newsProviderConfig.count(),
    db.destination.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
    }),
    db.publishingStream.findMany({
      include: {
        defaultTemplate: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        destination: {
          select: {
            id: true,
            kind: true,
            name: true,
            platform: true,
            slug: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    }),
    db.destinationTemplate.findMany({
      include: {
        streams: {
          include: {
            destination: {
              select: {
                id: true,
                kind: true,
                name: true,
                platform: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
    }),
  ]);
  const configurationIssues = getConfigurationIssues({
    destinations,
    streams,
    templates,
  });

  return {
    configurationIssues,
    locales,
    scheduler: env.scheduler,
    storage: {
      driver: env.media.driver,
      maxRemoteFileBytes: env.media.maxRemoteFileBytes,
      uploadAllowedMimeTypes: env.media.uploadAllowedMimeTypes,
    },
    summary: {
      configurationIssueCount: configurationIssues.length,
      destinationCount: destinations.length,
      providerCount,
      streamCount: streams.length,
    },
    toggles: env.observability,
  };
}
