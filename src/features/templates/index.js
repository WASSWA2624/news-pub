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
        is_default: true,
      },
    }),
    db.destinationTemplate.count({
      where: {
        category_id: {
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

export async function saveTemplateRecord(input, { actor_id } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = trimText(input.name);
  const platform = trimText(input.platform).toUpperCase();

  if (!name || !platform || !trimText(input.body_template)) {
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
          body_template: trimText(input.body_template),
          category_id: input.category_id || null,
          hashtags_template: trimText(input.hashtags_template) || null,
          is_default: Boolean(input.is_default),
          locale: trimText(input.locale) || null,
          name,
          platform,
          summary_template: trimText(input.summary_template) || null,
          title_template: trimText(input.title_template) || null,
        },
      })
    : await db.destinationTemplate.create({
        data: {
          body_template: trimText(input.body_template),
          category_id: input.category_id || null,
          hashtags_template: trimText(input.hashtags_template) || null,
          is_default: Boolean(input.is_default),
          locale: trimText(input.locale) || null,
          name,
          platform,
          summary_template: trimText(input.summary_template) || null,
          title_template: trimText(input.title_template) || null,
        },
      });

  if (template.is_default) {
    await db.destinationTemplate.updateMany({
      data: {
        is_default: false,
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
      actor_id,
      entity_id: template.id,
      entity_type: "destination_template",
      payload_json: {
        is_default: template.is_default,
        platform: template.platform,
      },
    },
    db,
  );

  return template;
}
