import { createAuditEventRecord } from "@/lib/analytics";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { getTemplateValidationIssues } from "@/lib/validation/configuration";

export async function getTemplateManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [templates, categories] = await Promise.all([
    db.destinationTemplate.findMany({
      include: {
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
        },
      },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
    }),
    db.category.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        description: true,
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    categories,
    templates: templates.map((template) => ({
      ...template,
      validationIssues: getTemplateValidationIssues(template),
    })),
    summary: {
      defaultCount: templates.filter((template) => template.isDefault).length,
      totalCount: templates.length,
    },
  };
}

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
