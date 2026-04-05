# ADR 0003: Source-Grounded Generation And Manual Publishing

- Status: Accepted
- Date: 2026-04-02
- Source sections: 2, 3.2, 7.1, 8, 43.2, 44, 46

## Context

Medical-equipment content can affect maintenance, troubleshooting, and safety behavior. The system therefore needs a hard line between verified facts and AI-composed writing, plus an explicit human gate before anything becomes public.

## Decision

The content pipeline is frozen around two rules:

1. Structured research is the factual source layer.
2. AI is the writing and organization layer on top of that source layer.

Release 1 generation and publishing policy:

- The system may automate normalization, source collection, structured extraction, validation, and draft generation.
- The model must not be treated as the source of truth for manuals, models, rankings, or technical facts.
- Missing or weakly supported information must remain explicit instead of being invented.
- Draft generation may be automatic.
- Publishing must remain a manual editor action.

The expected flow is:

1. Normalize the equipment input.
2. Collect approved source material.
3. Build a structured research payload.
4. Validate the research payload.
5. Generate structured article output, Markdown, HTML, and SEO artifacts.
6. Save the result as a draft for human review.

## Consequences

- Later AI prompts must preserve warnings, references, and the required disclaimer.
- Later validation steps must reject unsupported factual claims rather than trying to smooth them over.
- No later step may introduce fully automatic publish-on-generation behavior for Release 1.
