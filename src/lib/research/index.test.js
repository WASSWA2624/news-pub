import { SourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildVerifiedResearchPayload,
  researchSourceAdapters,
  researchSourcePriority,
} from "./index";

describe("research payload builder", () => {
  it("keeps source adapters in the required policy order", () => {
    expect(researchSourcePriority).toEqual([
      "OFFICIAL_MANUFACTURER_WEBSITE",
      "OFFICIAL_PRODUCT_PAGE",
      "OFFICIAL_MANUAL",
      "OFFICIAL_DISTRIBUTOR_DOCUMENTATION",
      "TRUSTED_BIOMEDICAL_REFERENCE",
      "TRUSTED_PROFESSIONAL_SOCIETY",
      "REPUTABLE_EDUCATIONAL_INSTITUTION",
      "APPROVED_SEARCH_RESULT",
    ]);

    expect(researchSourceAdapters.map((adapter) => adapter.sourceType)).toEqual(
      researchSourcePriority,
    );
  });

  it("collapses manufacturer aliases into one canonical record and ranks models deterministically", () => {
    const payload = buildVerifiedResearchPayload({
      definition: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Microscope overview",
            url: "https://nih.gov/microscope-overview",
          },
        ],
        summary: "A microscope magnifies small objects for visual inspection.",
      },
      equipment: {
        aliases: ["Laboratory microscope"],
        name: "Microscope",
      },
      manufacturers: [
        {
          aliases: ["Acme Med"],
          models: [
            {
              aliases: ["Vision-200"],
              equipmentTypeConfirmed: true,
              latestKnownYear: 2023,
              name: "Vision 200",
              sources: [
                {
                  sourceType: SourceType.OFFICIAL_PRODUCT_PAGE,
                  title: "Vision 200 product page",
                  url: "https://acme.example/vision-200",
                },
                {
                  sourceType: SourceType.OFFICIAL_MANUAL,
                  title: "Vision 200 manual",
                  url: "https://acme.example/vision-200-manual.pdf",
                },
              ],
            },
          ],
          name: "ACME Medical",
          primaryDomain: "acme.example",
          sources: [
            {
              sourceType: SourceType.OFFICIAL_MANUFACTURER_WEBSITE,
              title: "ACME microscopes",
              url: "https://acme.example/microscopes",
            },
          ],
        },
        {
          models: [
            {
              equipmentTypeConfirmed: true,
              latestKnownYear: 2024,
              name: "Vision-200",
              sources: [
                {
                  sourceType: SourceType.OFFICIAL_MANUAL,
                  title: "Vision 200 service manual",
                  url: "https://acme.example/vision-200-service.pdf",
                },
              ],
            },
          ],
          name: "Acme Med",
          primaryDomain: "acme.example",
          sources: [
            {
              sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
              title: "Acme procurement reference",
              url: "https://medlineplus.gov/acme-procurement",
            },
          ],
        },
        {
          aliases: ["Bravo"],
          name: "Bravo Instruments",
          primaryDomain: "bravo.example",
          sources: [
            {
              sourceType: SourceType.OFFICIAL_DISTRIBUTOR_DOCUMENTATION,
              title: "Bravo distributor listing",
              url: "https://catalog.example/bravo-microscope",
            },
          ],
        },
      ],
      operatingPrinciple: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Optics reference",
            url: "https://nih.gov/optics-reference",
          },
        ],
        summary: "The optical train uses lenses and illumination to magnify the specimen.",
      },
    });

    expect(payload.verification.isValid).toBe(true);
    expect(payload.manufacturers).toHaveLength(2);
    expect(payload.manufacturers[0]).toMatchObject({
      name: "ACME Medical",
      primaryDomain: "acme.example",
    });
    expect(payload.manufacturers[0].aliases).toEqual(["Acme Med"]);
    expect(payload.manufacturers[0].models).toHaveLength(1);
    expect(payload.manufacturers[0].models[0]).toMatchObject({
      latestKnownYear: 2024,
      name: "Vision 200",
    });
    expect(payload.manufacturers[0].rankingScore).toBeGreaterThan(
      payload.manufacturers[1].rankingScore,
    );
    expect(payload.manufacturers[0].models[0].sourceReferenceIds.length).toBeGreaterThanOrEqual(2);
  });

  it("orders normalized faults by evidence count, severity, and title", () => {
    const payload = buildVerifiedResearchPayload({
      definition: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Definition",
            url: "https://nih.gov/definition",
          },
        ],
        summary: "Microscope definition.",
      },
      equipment: {
        name: "Microscope",
      },
      faults: [
        {
          cause: "Dirty objective lens.",
          remedy: "Clean the lens.",
          severity: "medium",
          sources: [
            {
              sourceType: SourceType.OFFICIAL_MANUAL,
              title: "Manual A",
              url: "https://acme.example/manual-a.pdf",
            },
          ],
          symptoms: "The image lacks sharp detail.",
          title: "Image is blurry",
        },
        {
          cause: "Dirty objective lens.",
          remedy: "Clean the lens and refocus.",
          severity: "high",
          sources: [
            {
              sourceType: SourceType.OFFICIAL_MANUAL,
              title: "Manual B",
              url: "https://acme.example/manual-b.pdf",
            },
          ],
          symptoms: "The image lacks sharp detail.",
          title: " Image is blurry ",
        },
        {
          cause: "Lamp assembly has failed.",
          remedy: "Replace the lamp.",
          severity: "high",
          sources: [
            {
              sourceType: SourceType.OFFICIAL_MANUAL,
              title: "Manual C",
              url: "https://acme.example/manual-c.pdf",
            },
          ],
          symptoms: "No illumination appears at the eyepiece.",
          title: "Lamp will not turn on",
        },
      ],
      operatingPrinciple: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Principle",
            url: "https://nih.gov/principle",
          },
        ],
        summary: "Light and lenses produce magnification.",
      },
    });

    expect(payload.faults).toHaveLength(2);
    expect(payload.faults[0]).toMatchObject({
      evidenceCount: 2,
      severity: "HIGH",
      sortOrder: 1,
      title: "Image is blurry",
    });
    expect(payload.faults[1]).toMatchObject({
      evidenceCount: 1,
      sortOrder: 2,
      title: "Lamp will not turn on",
    });
  });

  it("filters disallowed source domains and records the resulting warning", () => {
    const payload = buildVerifiedResearchPayload({
      definition: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Blocked domain definition",
            url: "https://blocked.example/microscope",
          },
        ],
        summary: "Microscope definition.",
      },
      equipment: {
        name: "Microscope",
      },
      operatingPrinciple: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Allowed principle",
            url: "https://allowed.example/principle",
          },
        ],
        summary: "Light and lenses produce magnification.",
      },
      sourceConfigs: [
        {
          allowedDomains: ["allowed.example"],
          isEnabled: true,
          notes: "Limit to the approved biomedical domain.",
          sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
        },
      ],
    });

    expect(payload.definition?.sourceReferenceIds).toEqual([]);
    expect(payload.reliabilityWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining("not allowed")]),
    );
    expect(payload.verification.missingAttributionClusters).toEqual(
      expect.arrayContaining(["definition"]),
    );
  });

  it("promotes media sourceUrl values into persisted source references", () => {
    const payload = buildVerifiedResearchPayload({
      definition: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Definition",
            url: "https://nih.gov/definition",
          },
        ],
        summary: "Microscope definition.",
      },
      equipment: {
        name: "Microscope",
      },
      mediaCandidates: [
        {
          alt: "Microscope bench image",
          sourceDomain: "fixtures.example",
          sourceType: SourceType.APPROVED_SEARCH_RESULT,
          sourceUrl: "https://fixtures.example/images/microscope-bench.jpg",
        },
      ],
      operatingPrinciple: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Principle",
            url: "https://nih.gov/principle",
          },
        ],
        summary: "Light and lenses produce magnification.",
      },
    });

    const mediaReference = payload.sourceReferences.find(
      (reference) => reference.url === "https://fixtures.example/images/microscope-bench.jpg",
    );

    expect(mediaReference).toMatchObject({
      sourceDomain: "fixtures.example",
      sourceType: SourceType.APPROVED_SEARCH_RESULT,
      title: "fixtures.example",
      url: "https://fixtures.example/images/microscope-bench.jpg",
    });
    expect(payload.mediaCandidates[0].sourceReferenceIds).toContain(mediaReference.id);
  });

  it("skips unsafe source URLs before they can enter references or manuals", () => {
    const payload = buildVerifiedResearchPayload({
      definition: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Unsafe definition source",
            url: "javascript:alert(1)",
          },
        ],
        summary: "Microscope definition.",
      },
      equipment: {
        name: "Microscope",
      },
      manuals: [
        {
          title: "Unsafe manual",
          url: "javascript:alert(1)",
        },
      ],
      operatingPrinciple: {
        sources: [
          {
            sourceType: SourceType.TRUSTED_BIOMEDICAL_REFERENCE,
            title: "Principle",
            url: "https://nih.gov/principle",
          },
        ],
        summary: "Light and lenses produce magnification.",
      },
    });

    expect(payload.sourceReferences.some((reference) => reference.url.startsWith("javascript:"))).toBe(false);
    expect(payload.manuals).toEqual([]);
    expect(payload.reliabilityWarnings).toEqual(
      expect.arrayContaining([expect.stringContaining("must use an http or https URL")]),
    );
  });
});
