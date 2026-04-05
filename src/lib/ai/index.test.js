import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    SESSION_SECRET: "change-me",
    SESSION_MAX_AGE_SECONDS: "28800",
    AI_PROVIDER_DEFAULT: "openai",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_PROVIDER_FALLBACK: "openai",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    OPENAI_API_KEY: "test-openai-key",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    MEDIA_DRIVER: "local",
    LOCAL_MEDIA_BASE_PATH: "public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    S3_MEDIA_BUCKET: "",
    S3_MEDIA_REGION: "",
    S3_MEDIA_BASE_URL: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "strong-password",
    COMMENT_RATE_LIMIT_WINDOW_MS: "60000",
    COMMENT_RATE_LIMIT_MAX: "5",
    COMMENT_CAPTCHA_ENABLED: "false",
    COMMENT_CAPTCHA_SECRET: "",
    UPLOAD_ALLOWED_MIME_TYPES: "image/jpeg,image/png,image/webp",
    REVALIDATE_SECRET: "change-me",
    CRON_SECRET: "change-me",
  };
}

function createPromptLayers() {
  return [
    {
      id: "prompt_system",
      isActive: true,
      name: "System",
      purpose: "system_instruction",
      systemPrompt: "Write educational equipment guides.",
      userPromptTemplate: "Generate a guide for {{equipmentName}}.",
      version: 1,
    },
    {
      id: "prompt_grounding",
      isActive: true,
      name: "Grounding",
      purpose: "data_grounding",
      systemPrompt: "Use the research payload as truth.",
      userPromptTemplate: "Research: {{researchPayloadJson}}",
      version: 1,
    },
    {
      id: "prompt_json",
      isActive: true,
      name: "Output structure",
      purpose: "output_json_structure",
      systemPrompt: "Return structured content.",
      userPromptTemplate: "Section order: {{sectionOrderJson}}",
      version: 1,
    },
    {
      id: "prompt_format",
      isActive: true,
      name: "Formatting",
      purpose: "article_formatting",
      systemPrompt: "Format Markdown and HTML.",
      userPromptTemplate: "Article JSON: {{articleJson}}",
      version: 1,
    },
    {
      id: "prompt_safety",
      isActive: true,
      name: "Safety",
      purpose: "safety_boundaries",
      systemPrompt: "Preserve disclaimer and warnings.",
      userPromptTemplate: "Disclaimer: {{disclaimer}}",
      version: 1,
    },
  ];
}

function createGenerationRequest(overrides = {}) {
  return {
    articleDepth: "complete",
    equipmentName: "Endoscopy machine",
    includeFaults: true,
    includeImages: true,
    includeManualLinks: true,
    includeManufacturers: true,
    includeModels: true,
    locale: "en",
    providerConfigId: "provider_cfg_default_generation",
    replaceExistingPost: false,
    schedulePublishAt: null,
    targetAudience: ["students", "technicians", "biomedical_staff"],
    ...overrides,
  };
}

async function createEndoscopyFixtureResolution() {
  const [{ getFixtureByNormalizedEquipmentName }, { buildVerifiedResearchPayload }] = await Promise.all([
    import("./fixture-data"),
    import("@/lib/research"),
  ]);
  const fixture = getFixtureByNormalizedEquipmentName("endoscopy machine");
  const researchPayload = buildVerifiedResearchPayload(
    {
      ...fixture.researchInput,
      equipment: {
        aliases: fixture.researchInput.aliases || [],
        name: "Endoscopy machine",
      },
      equipmentName: "Endoscopy machine",
      locale: "en",
      sourceConfigs: [],
    },
    {
      now: new Date("2026-04-03T08:00:00.000Z"),
    },
  );

  return {
    fixture,
    researchPayload,
  };
}

function createDuplicatePost(overrides = {}) {
  return {
    createdAt: new Date("2026-04-03T07:00:00.000Z"),
    editorialStage: "REVIEWED",
    id: "post_1",
    publishedAt: new Date("2026-04-03T08:00:00.000Z"),
    scheduledPublishAt: null,
    slug: "endoscopy-machine",
    status: "PUBLISHED",
    translations: [
      {
        id: "translation_existing",
        title: "Endoscopy machine",
      },
    ],
    updatedAt: new Date("2026-04-03T09:00:00.000Z"),
    ...overrides,
  };
}

const originalEnv = process.env;

describe("AI composition pipeline", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads the latest active prompt layers in the required order", async () => {
    const prisma = {
      promptTemplate: {
        findMany: vi.fn().mockResolvedValue([
          ...createPromptLayers(),
          {
            id: "prompt_system_v2",
            isActive: true,
            name: "System v2",
            purpose: "system_instruction",
            systemPrompt: "Write stronger educational guides.",
            userPromptTemplate: "Generate a richer guide for {{equipmentName}}.",
            version: 2,
          },
        ]),
      },
    };
    const { loadActivePromptLayers, promptTemplatePurposeOrder } = await import("./index");

    const layers = await loadActivePromptLayers(prisma);

    expect(layers.map((layer) => layer.purpose)).toEqual(promptTemplatePurposeOrder);
    expect(layers[0]).toMatchObject({
      id: "prompt_system_v2",
      version: 2,
    });
  });

  it("builds a compliant endoscopy machine draft package with disclaimer and references preserved", async () => {
    const prisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage, generatedArticleSectionOrder } = await import("./index");
    const fixtureResolution = await createEndoscopyFixtureResolution();

    const draft = await composeDraftPackage(
      {
        articleDepth: "complete",
        equipmentName: "Endoscopy machine",
        includeFaults: true,
        includeImages: true,
        includeManualLinks: true,
        includeManufacturers: true,
        includeModels: true,
        locale: "en",
        providerConfigId: "provider_cfg_default_generation",
        replaceExistingPost: false,
        schedulePublishAt: null,
        targetAudience: ["students", "technicians", "biomedical_staff"],
      },
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "gpt-5.4",
          provider: "openai",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
        fixtureResolution,
      },
      prisma,
    );

    const sectionIds = draft.article.sections.map((section) => section.id);

    expect(sectionIds).toEqual(
      generatedArticleSectionOrder.filter((sectionId) => sectionIds.includes(sectionId)),
    );
    expect(sectionIds).toContain("operation_visual_guide");
    expect(
      sectionIds.includes("components_visual_guide") || sectionIds.includes("workflow_visual_guide"),
    ).toBe(true);
    expect(
      draft.article.sections.find((section) => section.id === "featured_image")?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscopy_Surgery.jpg",
      }),
    ]);
    expect(
      draft.article.sections.find((section) => section.id === "operation_visual_guide")?.images,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscopy.jpg",
        }),
        expect.objectContaining({
          sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flexibles_Endoskop.jpg",
        }),
      ]),
    );
    expect(
      draft.article.sections.find((section) => section.id === "components_visual_guide")?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flexibles_Endoskop.jpg",
      }),
    ]);
    expect(
      draft.article.sections.find((section) => section.id === "components_and_parts")?.items?.[0]?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: expect.any(String),
      }),
    ]);
    expect(
      draft.article.sections.find((section) => section.id === "uses_and_applications")?.items?.[0]?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: expect.any(String),
      }),
    ]);
    expect(
      draft.article.sections.find((section) => section.id === "model_visual_guide")?.images,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Bronchoscope.jpg",
        }),
        expect.objectContaining({
          sourceUrl:
            "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscope_at_Palais_de_la_Decouverte-IMG_6924-white.jpg",
        }),
      ]),
    );
    expect(
      draft.article.sections.find((section) => section.id === "commonly_encountered_models")?.groups?.[0]?.models?.[0]
        ?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: expect.any(String),
      }),
    ]);
    expect(
      draft.article.sections.find((section) => section.id === "workflow_visual_guide")?.images,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Bronchoscopy_nci-vol-1950-300.jpg",
        }),
      ]),
    );
    expect(
      draft.article.sections.find((section) => section.id === "sop_and_how_to_use_guidance")?.steps?.[0]?.images,
    ).toEqual([
      expect.objectContaining({
        sourceUrl: expect.any(String),
      }),
    ]);
    expect(draft.article.sections.find((section) => section.id === "references")?.items.length).toBeGreaterThan(0);
    expect(
      draft.article.sections.find((section) => section.id === "manuals_and_technical_documents")?.items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accessStatus: "available",
          fileType: "PDF",
          language: "English",
          lastCheckedAt: "2026-04-03T08:00:00.000Z",
          notes: "Operator guide for processor startup, image controls, and connected-scope workflow.",
          title: "Video endoscopy processor operator manual",
        }),
      ]),
    );
    expect(draft.article.sections.find((section) => section.id === "references")?.items[0]).toMatchObject({
      sourceReferenceIds: expect.any(Array),
    });
    expect(
      draft.article.sections.find((section) => section.id === "commonly_encountered_models")?.title,
    ).toBe("Commonly encountered models");
    expect(draft.article.sections.find((section) => section.id === "disclaimer")?.paragraphs).toEqual([
      "English disclaimer",
    ]);
    expect(draft.article.excerpt.toLowerCase()).not.toContain("draft");
    expect(draft.article.excerpt.toLowerCase()).not.toContain("research bundle");
    expect(draft.article.contentMd.toLowerCase()).not.toContain("synthesized orientation layer");
    expect(draft.article.contentMd).toContain("# Endoscopy machine");
    expect(draft.article.faq.length).toBeGreaterThanOrEqual(7);
    expect(draft.article.contentHtml).toContain("<article>");
    expect(draft.seoPayload.canonicalUrl).toContain("/en/blog/endoscopy-machine");
  });

  it("allows non-OpenAI provider configs to use the deterministic composition path", async () => {
    const prisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    const draft = await composeDraftPackage(
      createGenerationRequest(),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "claude-sonnet-4-5-20250929",
          provider: "anthropic",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      prisma,
    );

    expect(draft.providerConfig).toMatchObject({
      model: "claude-sonnet-4-5-20250929",
      provider: "anthropic",
    });
    expect(draft.providerExecutionMode).toBe("deterministic_fixture");
  });

  it("rejects reader-facing AI authorship disclosures in provider output", async () => {
    const baselinePrisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    const baselineDraft = await composeDraftPackage(
      createGenerationRequest(),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "gpt-5.4",
          provider: "openai",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      baselinePrisma,
    );

    await expect(
      composeDraftPackage(
        createGenerationRequest(),
        {
          disclaimer: "English disclaimer",
          promptLayers: createPromptLayers(),
          providerConfig: {
            id: "provider_cfg_default_generation",
            model: "gpt-5.4",
            provider: "openai",
          },
          providerOptions: {
            composeStructuredArticle: vi.fn(async () => ({
              executionMode: "ai_sdk_object",
              structuredArticle: {
                ...baselineDraft.article,
                excerpt: "This article was generated by AI from a structured research payload.",
              },
            })),
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("must not mention AI generation"),
      status: "provider_response_invalid",
    });
  });

  it("no longer fixture-blocks non-endoscopy equipment when a provider composition path is available", async () => {
    const prisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    const draft = await composeDraftPackage(
      createGenerationRequest({
        equipmentName: "Centrifuge",
      }),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "gpt-5.4",
          provider: "openai",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      prisma,
    );

    expect(draft.article.title).toContain("Centrifuge");
    expect(draft.providerExecutionMode).toBe("deterministic_fixture");
  });

  it("hydrates microscope generation from the same fixture-backed resolver path", async () => {
    const prisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    const draft = await composeDraftPackage(
      createGenerationRequest({
        equipmentName: "microscope",
      }),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "gpt-5.4",
          provider: "openai",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      prisma,
    );

    expect(draft.providerExecutionMode).toBe("deterministic_fixture");
    expect(
      draft.article.sections.find((section) => section.id === "featured_image")?.images?.[0]?.sourceUrl,
    ).toBe("https://fixtures.example/images/microscope-bench.jpg");
    expect(
      draft.article.sections.find((section) => section.id === "operation_visual_guide")?.images?.[0]?.sourceUrl,
    ).toBe("https://fixtures.example/images/microscope-optics.jpg");
  });

  it("retries with the configured fallback provider when the selected config fails", async () => {
    const baselinePrisma = {
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const primaryProviderConfig = {
      apiKeyEncrypted: null,
      apiKeyEnvName: "OPENAI_API_KEY",
      id: "provider_cfg_default_generation",
      model: "gpt-5.4",
      provider: "openai",
      purpose: "draft_generation",
    };
    const fallbackProviderConfig = {
      apiKeyEncrypted: null,
      apiKeyEnvName: "OPENAI_API_KEY",
      id: "provider_cfg_fallback_generation",
      isDefault: false,
      isEnabled: true,
      model: "gpt-5.4-mini",
      provider: "openai",
      purpose: "draft_generation_fallback",
      updatedAt: new Date("2026-04-03T08:00:00.000Z"),
    };
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(fallbackProviderConfig),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");
    const baselineDraft = await composeDraftPackage(
      createGenerationRequest(),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: primaryProviderConfig,
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      baselinePrisma,
    );

    const fallbackDraft = await composeDraftPackage(
      createGenerationRequest(),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: primaryProviderConfig,
        providerOptions: {
          composeStructuredArticle: vi.fn(async (context) => {
            if (context.providerConfig.id === primaryProviderConfig.id) {
              throw new Error("Primary provider request failed");
            }

            return {
              executionMode: "fallback_fixture",
              structuredArticle: baselineDraft.article,
            };
          }),
        },
      },
      prisma,
    );

    expect(fallbackDraft.providerConfig.id).toBe("provider_cfg_fallback_generation");
    expect(fallbackDraft.providerExecutionMode).toBe("fallback_fixture");
    expect(fallbackDraft.warnings.some((warning) => warning.includes("Retried with fallback"))).toBe(
      true,
    );
  });

  it("decodes provider authentication failures with provider and model context", async () => {
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    await expect(
      composeDraftPackage(
        createGenerationRequest(),
        {
          disclaimer: "English disclaimer",
          promptLayers: createPromptLayers(),
          providerConfig: {
            id: "provider_cfg_default_generation",
            model: "gpt-5.4",
            provider: "openai",
          },
          providerOptions: {
            composeStructuredArticle: vi.fn(async () => {
              throw Object.assign(new Error("Incorrect API key provided."), {
                code: "invalid_api_key",
                error: {
                  code: "invalid_api_key",
                  message: "Incorrect API key provided.",
                  type: "invalid_request_error",
                },
                status: 401,
              });
            }),
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      details: {
        model: "gpt-5.4",
        provider: "openai",
        providerCode: "invalid_api_key",
        providerLabel: "OpenAI",
        providerStatusCode: 401,
      },
      message: expect.stringContaining(
        "OpenAI / gpt-5.4 rejected the request because the credentials were not accepted.",
      ),
      status: "provider_authentication_failed",
      statusCode: 401,
    });
  });

  it("decodes unavailable model failures with provider and model context", async () => {
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    await expect(
      composeDraftPackage(
        createGenerationRequest(),
        {
          disclaimer: "English disclaimer",
          promptLayers: createPromptLayers(),
          providerConfig: {
            id: "provider_cfg_anthropic_generation",
            model: "claude-sonnet-4-5-20250929",
            provider: "anthropic",
          },
          providerOptions: {
            composeStructuredArticle: vi.fn(async () => {
              throw Object.assign(new Error('Model "claude-sonnet-4-5-20250929" was not found.'), {
                error: {
                  code: "model_not_found",
                  message: 'Model "claude-sonnet-4-5-20250929" was not found.',
                  type: "invalid_request_error",
                },
                status: 404,
              });
            }),
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      details: {
        model: "claude-sonnet-4-5-20250929",
        provider: "anthropic",
        providerCode: "model_not_found",
        providerLabel: "Anthropic",
        providerStatusCode: 404,
      },
      message: expect.stringContaining(
        "Anthropic / claude-sonnet-4-5-20250929 is not available for the configured account or endpoint.",
      ),
      status: "provider_model_unavailable",
      statusCode: 404,
    });
  });

  it("decodes provider rate limits with provider and model context", async () => {
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");

    await expect(
      composeDraftPackage(
        createGenerationRequest(),
        {
          disclaimer: "English disclaimer",
          promptLayers: createPromptLayers(),
          providerConfig: {
            id: "provider_cfg_anthropic_generation",
            model: "claude-sonnet-4-5-20250929",
            provider: "anthropic",
          },
          providerOptions: {
            composeStructuredArticle: vi.fn(async () => {
              throw Object.assign(new Error("Quota exceeded for this model."), {
                error: {
                  code: "resource_exhausted",
                  message: "Quota exceeded for this model.",
                  type: "rate_limit_error",
                },
                status: 429,
              });
            }),
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      details: {
        failureKind: "rate_limited",
        model: "claude-sonnet-4-5-20250929",
        provider: "anthropic",
        providerCode: "resource_exhausted",
        providerLabel: "Anthropic",
        providerStatusCode: 429,
      },
      message: expect.stringContaining(
        "Anthropic / claude-sonnet-4-5-20250929 temporarily rejected the request because the provider rate limit or quota was reached.",
      ),
      status: "provider_rate_limited",
      statusCode: 429,
    });
  });

  it("wraps invalid provider output with provider and model context", async () => {
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { composeDraftPackage } = await import("./index");
    const baselineDraft = await composeDraftPackage(
      createGenerationRequest(),
      {
        disclaimer: "English disclaimer",
        promptLayers: createPromptLayers(),
        providerConfig: {
          id: "provider_cfg_default_generation",
          model: "gpt-5.4",
          provider: "openai",
        },
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      {
        sourceConfig: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    );

    await expect(
      composeDraftPackage(
        createGenerationRequest(),
        {
          disclaimer: "English disclaimer",
          promptLayers: createPromptLayers(),
          providerConfig: {
            id: "provider_cfg_default_generation",
            model: "gpt-5.4",
            provider: "openai",
          },
          providerOptions: {
            composeStructuredArticle: vi.fn(async () => ({
              executionMode: "sdk_response",
              structuredArticle: {
                ...baselineDraft.article,
                title: "",
              },
            })),
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      details: {
        model: "gpt-5.4",
        provider: "openai",
        providerLabel: "OpenAI",
        providerMessage: "Generated draft title is required.",
      },
      message: "OpenAI / gpt-5.4 returned an invalid draft payload: Generated draft title is required.",
      status: "provider_response_invalid",
      statusCode: 502,
    });
  });

  it("persists the endoscopy machine acceptance draft, seo payload, structured blocks, and generation job", async () => {
    const generationJobCreate = vi.fn().mockResolvedValue({
      id: "job_1",
    });
    const generationJobUpdate = vi.fn().mockResolvedValue(null);
    const tx = {
      auditEvent: {
        create: vi.fn().mockResolvedValue(null),
      },
      equipment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "equipment_1",
            name: "Endoscopy machine",
            normalizedName: "endoscopy machine",
            slug: "endoscopy-machine",
          }),
        upsert: vi.fn().mockResolvedValue({
          id: "equipment_1",
          slug: "endoscopy-machine",
        }),
      },
      fault: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      maintenanceTask: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      manufacturer: {
        upsert: vi
          .fn()
          .mockResolvedValueOnce({ id: "manufacturer_1" })
          .mockResolvedValueOnce({ id: "manufacturer_2" })
          .mockResolvedValueOnce({ id: "manufacturer_3" }),
      },
      manufacturerAlias: {
        create: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      model: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      post: {
        create: vi.fn().mockResolvedValue({
          id: "post_1",
          slug: "endoscopy-machine",
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({
          id: "post_1",
          slug: "endoscopy-machine",
        }),
      },
      postManufacturer: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      postTranslation: {
        upsert: vi.fn().mockResolvedValue({
          id: "translation_1",
        }),
      },
      seoRecord: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      sourceReference: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
      generationJob: {
        create: generationJobCreate,
        update: generationJobUpdate,
      },
      equipment: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      modelProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_cfg_default_generation",
          isEnabled: true,
          model: "gpt-5.4",
          provider: "openai",
        }),
      },
      promptTemplate: {
        findMany: vi.fn().mockResolvedValue(createPromptLayers()),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { generateDraftFromRequest } = await import("./index");
    const fixtureResolution = await createEndoscopyFixtureResolution();

    const result = await generateDraftFromRequest(createGenerationRequest(), {
        actorId: "user_1",
        fixtureResolution,
        providerOptions: {
          useDeterministicFixture: true,
        },
      }, prisma);

    expect(result).toMatchObject({
      editorialStage: "GENERATED",
      jobId: "job_1",
      postId: "post_1",
      preview: {
        article: {
          title: expect.any(String),
        },
        post: {
          id: "post_1",
        },
      },
      status: "draft_saved",
      success: true,
    });
    expect(generationJobCreate).toHaveBeenCalledTimes(1);
    expect(generationJobUpdate).toHaveBeenCalled();
    expect(tx.postTranslation.upsert).toHaveBeenCalledTimes(1);
    expect(tx.seoRecord.upsert).toHaveBeenCalledTimes(1);
    expect(tx.fault.create).toHaveBeenCalled();
    expect(tx.maintenanceTask.create).toHaveBeenCalled();
    expect(tx.sourceReference.create).toHaveBeenCalled();
  });

  it("blocks duplicate generation before composition and leaves the existing post unchanged", async () => {
    const generationJobCreate = vi.fn().mockResolvedValue({
      id: "job_1",
    });
    const generationJobUpdate = vi.fn().mockResolvedValue(null);
    const duplicatePost = createDuplicatePost();
    const prisma = {
      auditEvent: {
        create: vi.fn().mockResolvedValue(null),
      },
      equipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "equipment_1",
          name: "Endoscopy machine",
          normalizedName: "endoscopy machine",
          slug: "endoscopy-machine",
        }),
      },
      generationJob: {
        create: generationJobCreate,
        update: generationJobUpdate,
      },
      modelProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_cfg_default_generation",
          isEnabled: true,
          model: "gpt-5.4",
          provider: "openai",
        }),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([duplicatePost]),
      },
    };
    const { generateDraftFromRequest } = await import("./index");

    await expect(
      generateDraftFromRequest(
        createGenerationRequest(),
        {
          actorId: "user_1",
          providerOptions: {
            useDeterministicFixture: true,
          },
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      details: {
        duplicateDecision: "replace_required",
      },
      status: "duplicate_post_detected",
    });

    expect(generationJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStage: "duplicate_check",
        }),
      }),
    );
    expect(generationJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStage: "duplicate_check_blocked",
          postId: "post_1",
          status: "CANCELLED",
        }),
      }),
    );
    expect(generationJobUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POST_GENERATION_DUPLICATE_BLOCKED",
          entityId: "job_1",
          entityType: "generation_job",
        }),
      }),
    );
  });

  it("replaces the matched post record and preserves its slug when replacement is confirmed", async () => {
    const generationJobCreate = vi.fn().mockResolvedValue({
      id: "job_1",
    });
    const generationJobUpdate = vi.fn().mockResolvedValue(null);
    const duplicatePost = createDuplicatePost();
    const tx = {
      auditEvent: {
        create: vi.fn().mockResolvedValue(null),
      },
      equipment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "equipment_1",
            slug: "endoscopy-machine",
          })
          .mockResolvedValueOnce({
            id: "equipment_1",
            name: "Endoscopy machine",
            normalizedName: "endoscopy machine",
            slug: "endoscopy-machine",
          }),
        upsert: vi.fn().mockResolvedValue({
          id: "equipment_1",
          slug: "endoscopy-machine",
        }),
      },
      fault: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      maintenanceTask: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      manufacturer: {
        upsert: vi
          .fn()
          .mockResolvedValueOnce({ id: "manufacturer_1" })
          .mockResolvedValueOnce({ id: "manufacturer_2" })
          .mockResolvedValueOnce({ id: "manufacturer_3" }),
      },
      manufacturerAlias: {
        create: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      model: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      post: {
        create: vi.fn().mockResolvedValue({
          id: "post_2",
          slug: "endoscopy-machine-2",
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([duplicatePost]),
        update: vi.fn().mockResolvedValue({
          id: "post_1",
          slug: "endoscopy-machine",
        }),
      },
      postManufacturer: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
      postTranslation: {
        upsert: vi.fn().mockResolvedValue({
          id: "translation_1",
        }),
      },
      seoRecord: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      sourceReference: {
        create: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
      equipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "equipment_1",
          name: "Endoscopy machine",
          normalizedName: "endoscopy machine",
          slug: "endoscopy-machine",
        }),
      },
      generationJob: {
        create: generationJobCreate,
        update: generationJobUpdate,
      },
      modelProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_cfg_default_generation",
          isEnabled: true,
          model: "gpt-5.4",
          provider: "openai",
        }),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([duplicatePost]),
      },
      promptTemplate: {
        findMany: vi.fn().mockResolvedValue(createPromptLayers()),
      },
      sourceConfig: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { generateDraftFromRequest } = await import("./index");
    const fixtureResolution = await createEndoscopyFixtureResolution();

    const result = await generateDraftFromRequest(
      createGenerationRequest({
        replaceExistingPost: true,
      }),
      {
        actorId: "user_1",
        fixtureResolution,
        providerOptions: {
          useDeterministicFixture: true,
        },
      },
      prisma,
    );

    expect(result).toMatchObject({
      editorialStage: "GENERATED",
      jobId: "job_1",
      postId: "post_1",
      preview: {
        duplicateCheck: {
          duplicateDetected: true,
        },
      },
      success: true,
    });
    expect(tx.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "endoscopy-machine",
        }),
        where: {
          id: "post_1",
        },
      }),
    );
    expect(tx.post.create).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POST_DUPLICATE_REPLACED",
          entityId: "post_1",
        }),
      }),
    );
    expect(generationJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          postId: "post_1",
          responseJson: expect.objectContaining({
            duplicateDecision: "replace_existing",
          }),
          status: "COMPLETED",
        }),
      }),
    );
  });
});
