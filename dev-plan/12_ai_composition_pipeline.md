# 12 AI Composition Pipeline

Source sections: 3.1, 8, 9, 18, 28, 37, 38, 5.2.
Atomic aspect: AI composition, prompt configuration, and draft assembly only.
Prerequisite: step 11.

## Goal

Turn verified structured research into complete drafts that match the required article template.

## Implement

1. Build the provider/model abstraction using `providerConfigId`, and make sure any supported provider can flow through the composition pipeline without hard-coded provider gating.
2. Build the trusted provider catalog sync/search layer that can load model suggestions from official provider APIs, docs, or provider-owned catalog feeds.
3. Implement prompt-template loading from `PromptTemplate`.
4. Implement the required prompt layers from section 18.4.
5. Generate structured article JSON first, then Markdown, then HTML, then SEO payloads.
6. Persist structured JSON blocks for faults, maintenance, models, and FAQs.
7. Ensure generated drafts follow the required order in section 9.
8. Build the admin Prompt Configuration page.
9. Use `microscope` from section 38 as the baseline acceptance fixture.

## Required Outputs

- draft-generation engine
- trusted provider catalog service
- prompt configuration admin surface
- acceptance fixture tests

## Verify

- generated drafts contain the required sections
- disclaimers and references are never omitted
- provider catalogs refresh from trusted sources without shipping hard-coded model enums
- `microscope` generates a compliant acceptance draft

## Exit Criteria

- the pipeline can create a valid draft from verified research input
