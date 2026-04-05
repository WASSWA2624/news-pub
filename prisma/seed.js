const crypto = require("node:crypto");
const path = require("node:path");

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient, SourceType, UserRole } = require("@prisma/client");
const { config: loadEnv } = require("dotenv");

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });
loadEnv();

const RELEASE_ONE_DISCLAIMER =
  "While care has been taken to ensure accuracy of the content in this post, this content is provided for educational and informational purposes only. It does not replace the manufacturer's official instructions, operator manual, service manual, safety procedures, or institutional biomedical engineering protocols. Always follow the official manufacturer guidelines and applicable clinical regulations.";

const BASELINE_LOCALES = [
  {
    code: "en",
    name: "English",
    isActive: true,
    isDefault: true,
  },
];

const PROMPT_TEMPLATES = [
  {
    id: "prompt_tpl_system_instruction_v1",
    name: "Release 1 System Writing Instruction",
    purpose: "system_instruction",
    version: 1,
    systemPrompt:
      "You are an expert editorial writer for medical-equipment content. Produce clear, publication-ready, source-grounded articles for learners and practitioners without overstating certainty.",
    userPromptTemplate:
      "Generate an English-first article for {{equipmentName}} in locale {{locale}}. Respect the selected article depth {{articleDepth}} and address these audiences: {{targetAudienceList}}.",
    isActive: true,
  },
  {
    id: "prompt_tpl_data_grounding_v1",
    name: "Release 1 Data Grounding Instruction",
    purpose: "data_grounding",
    version: 1,
    systemPrompt:
      "Use the provided research payload as the factual basis for every claim. Never invent manuals, models, rankings, citations, or technical claims, and keep unsupported details explicit as warnings or gaps.",
    userPromptTemplate:
      "Treat this structured research payload as authoritative input and preserve its evidence clusters, caveats, and missing-data notes: {{researchPayloadJson}}.",
    isActive: true,
  },
  {
    id: "prompt_tpl_output_json_structure_v1",
    name: "Release 1 Structured Output Instruction",
    purpose: "output_json_structure",
    version: 1,
    systemPrompt:
      "Return structured article JSON that reads like a polished editorial article, separates facts from warnings, and keeps faults, maintenance tasks, models, manuals, and FAQs machine-readable.",
    userPromptTemplate:
      "Produce sectioned article JSON using the required section order {{sectionOrderJson}}. Preserve references, disclaimer content, and reliability warnings in the output structure. Never mention prompts, research payloads, internal workflows, or how the article was produced.",
    isActive: true,
  },
  {
    id: "prompt_tpl_article_formatting_v1",
    name: "Release 1 Final Article Formatting Instruction",
    purpose: "article_formatting",
    version: 1,
    systemPrompt:
      "Transform validated article data into polished Markdown, sanitized HTML, and SEO-ready copy without changing factual meaning or removing references, manual links, or captions. The published copy must read like standard editorial content.",
    userPromptTemplate:
      "Format this validated article into Markdown and HTML for locale {{locale}} while keeping headings, references, and media attribution intact: {{articleJson}}.",
    isActive: true,
  },
  {
    id: "prompt_tpl_safety_boundaries_v1",
    name: "Release 1 Safety Boundaries Instruction",
    purpose: "safety_boundaries",
    version: 1,
    systemPrompt:
      "Keep the content educational and non-diagnostic. Clearly separate facts, guidance, and warnings, never present the article as a replacement for official manufacturer instructions or institutional protocols, and never mention AI, automation, model names, prompts, or that the article was generated or compiled.",
    userPromptTemplate:
      `Preserve this disclaimer verbatim in the final article and reflect any safety caveats in summaries and FAQs: ${RELEASE_ONE_DISCLAIMER}`,
    isActive: true,
  },
];

const SOURCE_CONFIGS = [
  {
    id: "source_cfg_official_manufacturer_website",
    name: "Official Manufacturer Websites",
    sourceType: SourceType.OFFICIAL_MANUFACTURER_WEBSITE,
    priority: 1,
    isEnabled: true,
    allowedDomainsJson: [],
    notes:
      "Highest-priority tier. Validate against manufacturer-owned domains discovered for the canonical equipment or manufacturer record.",
  },
  {
    id: "source_cfg_official_product_page",
    name: "Official Product Pages",
    sourceType: SourceType.OFFICIAL_PRODUCT_PAGE,
    priority: 2,
    isEnabled: true,
    allowedDomainsJson: [],
    notes:
      "Use official product-detail pages that are hosted on manufacturer-controlled domains and tied to the target equipment type.",
  },
  {
    id: "source_cfg_official_manual",
    name: "Official Manuals And Service Documents",
    sourceType: SourceType.OFFICIAL_MANUAL,
    priority: 3,
    isEnabled: true,
    allowedDomainsJson: [],
    notes:
      "Accept official manuals, brochures, IFUs, and service documentation that can be linked back to the manufacturer or product owner.",
  },
  {
    id: "source_cfg_official_distributor_documentation",
    name: "Official Distributor Documentation",
    sourceType: SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION,
    priority: 4,
    isEnabled: true,
    allowedDomainsJson: [],
    notes:
      "Distributor and procurement documentation is allowed when the distributor relationship can be verified for the target device or manufacturer.",
  },
  {
    id: "source_cfg_trusted_biomedical_reference",
    name: "Trusted Biomedical References",
    sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
    priority: 5,
    isEnabled: true,
    allowedDomainsJson: ["who.int", "nih.gov", "ncbi.nlm.nih.gov", "medlineplus.gov", "fda.gov"],
    notes:
      "Use biomedical and public-health references to corroborate terminology, safety guidance, and educational context.",
  },
  {
    id: "source_cfg_trusted_professional_society",
    name: "Trusted Professional Societies",
    sourceType: SourceType.TRUSTED_PROFESSIONAL_SOCIETY,
    priority: 6,
    isEnabled: true,
    allowedDomainsJson: ["aami.org", "ifmbe.org"],
    notes:
      "Society guidance can support terminology and practice context when it does not contradict higher-priority official sources.",
  },
  {
    id: "source_cfg_reputable_educational_institution",
    name: "Reputable Educational Institutions",
    sourceType: SourceType.REPUTABLE_EDUCATIONAL_INSTITUTION,
    priority: 7,
    isEnabled: true,
    allowedDomainsJson: ["*.edu", "*.ac.uk", "*.ac.ug"],
    notes:
      "Educational institutions can be used for explanatory context and training support when the content remains clearly source-grounded.",
  },
  {
    id: "source_cfg_approved_search_result",
    name: "Approved Search Results",
    sourceType: SourceType.APPROVED_SEARCH_RESULT,
    priority: 8,
    isEnabled: true,
    allowedDomainsJson: [],
    notes:
      "Use approved search integrations to discover candidates, then validate each result against the enabled source-tier rules before storage.",
  },
];

const DEFAULT_CATEGORIES = [
  {
    slug: "equipment-guides",
    name: "Equipment Guides",
    description: "Canonical long-form educational guides for medical equipment types.",
  },
  {
    slug: "maintenance-and-care",
    name: "Maintenance And Care",
    description: "Preventive maintenance, cleaning, storage, and care guidance for equipment posts.",
  },
  {
    slug: "faults-and-troubleshooting",
    name: "Faults And Troubleshooting",
    description: "Source-grounded fault, symptom, cause, and remedy coverage for supported devices.",
  },
];

const DEFAULT_TAGS = [
  {
    slug: "medical-equipment",
    name: "Medical Equipment",
  },
  {
    slug: "biomedical-engineering",
    name: "Biomedical Engineering",
  },
  {
    slug: "preventive-maintenance",
    name: "Preventive Maintenance",
  },
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to run prisma seeds.`);
  }

  return value;
}

function getApiKeyEnvName(provider) {
  if (provider === "openai") {
    return "OPENAI_API_KEY";
  }

  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

function createAdapterFromDatabaseUrl(databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name for Prisma seeds.");
  }

  return new PrismaMariaDb({
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database,
    connectionLimit: Number.parseInt(parsedUrl.searchParams.get("connection_limit") || "5", 10),
  });
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    maxmem: 128 * 1024 * 1024,
    N: 32768,
    p: 1,
    r: 8,
  });

  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

function getProviderConfigs() {
  return [
    {
      id: "provider_cfg_default_generation",
      provider: requiredEnv("AI_PROVIDER_DEFAULT"),
      model: requiredEnv("AI_MODEL_DEFAULT"),
      purpose: "draft_generation",
      apiKeyEnvName: getApiKeyEnvName(requiredEnv("AI_PROVIDER_DEFAULT")),
      isDefault: true,
      isEnabled: true,
    },
    {
      id: "provider_cfg_fallback_generation",
      provider: requiredEnv("AI_PROVIDER_FALLBACK"),
      model: requiredEnv("AI_MODEL_FALLBACK"),
      purpose: "draft_generation_fallback",
      apiKeyEnvName: getApiKeyEnvName(requiredEnv("AI_PROVIDER_FALLBACK")),
      isDefault: false,
      isEnabled: true,
    },
  ];
}

async function seedLocales(tx) {
  for (const locale of BASELINE_LOCALES) {
    await tx.locale.upsert({
      where: { code: locale.code },
      update: locale,
      create: locale,
    });
  }

  return BASELINE_LOCALES.length;
}

async function invalidateAdminSessions(tx, userId) {
  await tx.adminSession.updateMany({
    where: {
      invalidatedAt: null,
      userId,
    },
    data: {
      invalidatedAt: new Date(),
    },
  });
}

async function seedAdminUser(tx) {
  const email = requiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const password = requiredEnv("ADMIN_SEED_PASSWORD");
  const passwordHash = createPasswordHash(password);
  const existingUser = await tx.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    await tx.user.update({
      where: { email },
      data: {
        name: "Super Admin",
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });
    await invalidateAdminSessions(tx, existingUser.id);

    return { created: false };
  }

  const existingSeedAdmin = await tx.user.findFirst({
    where: {
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      email: true,
      id: true,
    },
  });

  if (existingSeedAdmin) {
    await tx.user.update({
      where: { id: existingSeedAdmin.id },
      data: {
        email,
        isActive: true,
        name: "Super Admin",
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    });
    await invalidateAdminSessions(tx, existingSeedAdmin.id);

    return {
      created: false,
      previousEmail: existingSeedAdmin.email,
      updatedEmail: existingSeedAdmin.email !== email,
    };
  }

  await tx.user.create({
    data: {
      email,
      name: "Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  return { created: true };
}

async function seedProviderConfigs(tx) {
  const providerConfigs = getProviderConfigs();

  for (const providerConfig of providerConfigs) {
    await tx.modelProviderConfig.upsert({
      where: { id: providerConfig.id },
      update: providerConfig,
      create: providerConfig,
    });
  }

  return providerConfigs.length;
}

async function seedPromptTemplates(tx) {
  for (const promptTemplate of PROMPT_TEMPLATES) {
    await tx.promptTemplate.upsert({
      where: { id: promptTemplate.id },
      update: promptTemplate,
      create: promptTemplate,
    });
  }

  return PROMPT_TEMPLATES.length;
}

async function seedSourceConfigs(tx) {
  for (const sourceConfig of SOURCE_CONFIGS) {
    await tx.sourceConfig.upsert({
      where: { id: sourceConfig.id },
      update: sourceConfig,
      create: sourceConfig,
    });
  }

  return SOURCE_CONFIGS.length;
}

async function seedCategories(tx) {
  for (const category of DEFAULT_CATEGORIES) {
    await tx.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  return DEFAULT_CATEGORIES.length;
}

async function seedTags(tx) {
  for (const tag of DEFAULT_TAGS) {
    await tx.tag.upsert({
      where: { slug: tag.slug },
      update: tag,
      create: tag,
    });
  }

  return DEFAULT_TAGS.length;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(requiredEnv("DATABASE_URL")),
  });

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const locales = await seedLocales(tx);
      const admin = await seedAdminUser(tx);
      const providerConfigs = await seedProviderConfigs(tx);
      const promptTemplates = await seedPromptTemplates(tx);
      const sourceConfigs = await seedSourceConfigs(tx);
      const categories = await seedCategories(tx);
      const tags = await seedTags(tx);

      return {
        locales,
        adminCreated: admin.created,
        providerConfigs,
        promptTemplates,
        sourceConfigs,
        categories,
        tags,
      };
    });

    console.log("Prisma seed completed.");
    console.table({
      locales: summary.locales,
      adminCreated: summary.adminCreated ? 1 : 0,
      providerConfigs: summary.providerConfigs,
      promptTemplates: summary.promptTemplates,
      sourceConfigs: summary.sourceConfigs,
      categories: summary.categories,
      tags: summary.tags,
    });
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  BASELINE_LOCALES,
  DEFAULT_CATEGORIES,
  DEFAULT_TAGS,
  PROMPT_TEMPLATES,
  RELEASE_ONE_DISCLAIMER,
  SOURCE_CONFIGS,
  createAdapterFromDatabaseUrl,
  createPasswordHash,
  getApiKeyEnvName,
  getProviderConfigs,
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error("Prisma seed failed.");
    console.error(error);
    process.exitCode = 1;
  });
}
