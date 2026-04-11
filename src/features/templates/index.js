/**
 * Feature services for NewsPub destination-template management and template CRUD.
 */

import { createAuditEventRecord } from "@/lib/analytics";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { getTemplateValidationIssues } from "@/lib/validation/configuration";
/**
 * Returns the admin snapshot used by the NewsPub template management screen.
 */

const templateSnapshotLimit = 200;

export async function getTemplateManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [
    templates,
    categories,
    totalCount,
    defaultCount,
    categoryOverrideCount,
    localeOverrideCount,
  ] = await Promise.all([
    db.destinationTemplate.findMany({
      include: {
        _count: {
          select: {
            streams: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
          orderBy: {
            name: "asc",
          },
          take: 25,
        },
      },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      take: templateSnapshotLimit,
    }),
    db.category.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        description: true,
        id: true,
        name: true,
      },
    }),
    db.destinationTemplate.count(),
    db.destinationTemplate.count({
      where: {
        isDefault: true,
      },
    }),
    db.destinationTemplate.count({
      where: {
        categoryId: {
          not: null,
        },
      },
    }),
    db.destinationTemplate.count({
      where: {
        locale: {
          not: null,
        },
      },
    }),
  ]);

  return {
    categories,
    templates: templates.map((template) => {
      const { _count, ...templateFields } = template;

      return {
        ...templateFields,
        streamCount: _count.streams,
        validationIssues: getTemplateValidationIssues(templateFields),
      };
    }),
    summary: {
      categoryOverrideCount,
      defaultCount,
      localeOverrideCount,
      returnedCount: templates.length,
      totalCount,
    },
  };
}
/**
 * Creates or updates a NewsPub destination template record.
 */

export async function saveTemplateRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = trimText(input.name);
  const platform = trimText(input.platform).toUpperCase();

  if (!name || !platform || !trimText(input.bodyTemplate)) {
    throw new NewsPubError("Template name, platform, and body template are required.", {
      status: "template_validation_failed",
      statusCode: 400,
    });
  }

  const linkedTemplate = input.id
    ? await db.destinationTemplate.findUnique({
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
        where: {
          id: input.id,
        },
      })
    : null;

  if (input.id && !linkedTemplate) {
    throw new NewsPubError("The requested template could not be found.", {
      status: "template_validation_failed",
      statusCode: 400,
    });
  }

  const validationIssues = getTemplateValidationIssues({
    platform,
    streams: linkedTemplate?.streams || [],
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "template_validation_failed",
      statusCode: 400,
    });
  }

  const template = input.id
    ? await db.destinationTemplate.update({
        where: { id: input.id },
        data: {
          bodyTemplate: trimText(input.bodyTemplate),
          categoryId: input.categoryId || null,
          hashtagsTemplate: trimText(input.hashtagsTemplate) || null,
          isDefault: Boolean(input.isDefault),
          locale: trimText(input.locale) || null,
          name,
          platform,
          summaryTemplate: trimText(input.summaryTemplate) || null,
          titleTemplate: trimText(input.titleTemplate) || null,
        },
      })
    : await db.destinationTemplate.create({
        data: {
          bodyTemplate: trimText(input.bodyTemplate),
          categoryId: input.categoryId || null,
          hashtagsTemplate: trimText(input.hashtagsTemplate) || null,
          isDefault: Boolean(input.isDefault),
          locale: trimText(input.locale) || null,
          name,
          platform,
          summaryTemplate: trimText(input.summaryTemplate) || null,
          titleTemplate: trimText(input.titleTemplate) || null,
        },
      });

  if (template.isDefault) {
    await db.destinationTemplate.updateMany({
      data: {
        isDefault: false,
      },
      where: {
        id: {
          not: template.id,
        },
        platform: template.platform,
      },
    });
  }

  await createAuditEventRecord(
    {
      action: "DESTINATION_TEMPLATE_SAVED",
      actorId,
      entityId: template.id,
      entityType: "destination_template",
      payloadJson: {
        isDefault: template.isDefault,
        platform: template.platform,
      },
    },
    db,
  );

  return template;
}
