# 01 Architecture Decisions

Source sections: 1, 2, 4, 5, 6, 44, 45, 46.
Atomic aspect: architecture decisions only.
Prerequisite: none.

## Goal

Lock the non-negotiable architecture decisions before scaffolding begins.

## Implement

1. Create ADRs that freeze the required stack: Next.js App Router, JavaScript, Vercel AI SDK, styled-components, Redux Toolkit, Zod, Prisma, MySQL.
2. Record the routing strategy: locale-prefixed public routes with only `en` active in Release 1, root redirect at `/`, non-locale admin routes at `/admin`.
3. Record the content rule: AI is the writing layer, structured research is the factual source layer.
4. Record the publishing rule: draft generation may be automatic, publish must be manual.
5. Record the lifecycle rule: `status` and `editorialStage` are separate fields.
6. Record the storage rule: content is stored as Markdown, HTML, and structured JSON; media uses a driver abstraction.
7. Record the auth rule: Release 1 requires admin email/password auth and guest public comments.
8. Record the locale extensibility rule: adding a new locale should require a new locale file and registration in the existing locale configuration, not schema or route redesign.
9. Record the AI provider rule: supported providers include OpenAI, Anthropic, Google, Mistral AI, Cohere, xAI, Meta Platforms, Microsoft, Amazon, Groq, Together AI, Replicate, Hugging Face, DeepSeek, Stability AI, IBM, NVIDIA, Fireworks AI, Perplexity AI, and AI21 Labs, with searchable model catalogs loaded from trusted official sources instead of hard-coded model enums.

## Required Outputs

- ADR documents in a dedicated folder such as `docs/adr/`
- a one-page architecture summary linked from the repo root

## Verify

- every major module in section 44 has an owner and boundary
- every public route family and admin route family is documented
- the ADRs do not contradict `app-write-up.md`

## Exit Criteria

- stack, routing, auth, data-flow, and lifecycle decisions are frozen for later steps
