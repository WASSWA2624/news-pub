# NewsPub Comprehensive Upgrade Prompt

## Mission

Upgrade the NewsPub codebase comprehensively so the product is operationally reliable, UI-consistent, and resilient when optional AI functionality is unavailable.

The implementation must preserve the bounded NewsPub product shape. Do not reintroduce open-ended generation, prompt-lab, equipment, manufacturer, or unrelated legacy architecture.

## Non-Negotiable Runtime Rule For AI

AI is optional at runtime.

If the AI layer is disabled, misconfigured, missing credentials, unavailable, rate limited, timing out, returning invalid structured output, or otherwise unhealthy, **do not block the workflow**. Instead:

- skip AI intervention cleanly
- continue through deterministic formatting, canonical post content, or manual editorial flow as appropriate
- persist a machine-readable and admin-visible reason
- record `OptimizationStatus.SKIPPED` or `OptimizationStatus.FALLBACK` instead of treating the event as a hard failure
- keep fetch, review, scheduling, retry, and publication flows operational whenever platform and policy requirements are still satisfied

Do not make AI availability a hidden prerequisite for normal NewsPub use.

## Main Objectives

1. Strengthen reliability of provider, review, publishing, and retry flows.
2. Improve admin UX for all forms, including modal forms and long editorial screens.
3. Standardize button sizing and interaction behavior.
4. Improve accordion and accordion-like form sections so they support fast, low-friction editing.
5. Reduce UI nesting depth, duplication, and unnecessary client-side render cost.
6. Keep all changed runtime files professionally documented with current JSDoc and targeted inline comments.

## Required Product Behavior

### AI, fallback, and observability

- Treat AI as assistive only.
- Preserve facts, attribution, and policy checks.
- Reuse optimization cache when valid.
- When AI is skipped or falls back, show that state clearly in the admin UI, job history, audit logs, and post review surfaces.
- Never let optional AI failures corrupt queue state or block manual publish decisions.

### Form UX and modal UX

Apply these rules consistently to provider, destination, stream, template, settings, category, post-editor, and other admin forms:

- use one shared form design language for labels, help text, error text, spacing, and section rhythm
- keep primary actions obvious and easy to reach
- keep modal header context stable and modal footer actions consistently visible
- avoid scroll traps inside modals
- preserve entered values when non-blocking refreshes happen
- show validation close to the field and section that needs correction
- auto-focus or scroll to the first blocking issue on submit failure
- ensure keyboard-only users can complete all form flows

### Accordion and accordion-like improvements

For all disclosure-based sections in forms and editors:

- use a consistent disclosure component or behavior contract
- show section title, short summary, and completion or error state even when collapsed
- auto-expand sections that contain validation errors, required missing data, or blocking warnings
- keep toggles large enough to click comfortably
- ensure `aria-expanded`, focus treatment, and keyboard activation are correct
- avoid hiding important save-affecting information in collapsed regions without indicators
- support progressive disclosure without making the form feel fragmented

### Buttons and control sizing

- standardize button height across primary, secondary, danger, and footer actions
- standardize icon-leading button spacing and alignment
- keep action hierarchy consistent across cards, tables, toolbars, and modals
- do not allow the same action class to appear with multiple heights on different screens unless there is a clear accessibility reason

### Performance and code quality

- minimize component nesting depth where practical
- remove avoidable duplication
- extract reusable field, section, footer, disclosure, and status primitives where they genuinely reduce complexity
- avoid unnecessary client components and rerenders
- lazy-mount heavy sections when it improves responsiveness without harming usability
- keep list views paginated and bounded
- preserve or improve perceived speed on mobile and low-end devices

## Areas To Improve Based On Current Review

1. **AI-path documentation gap**
   - Existing code already includes deterministic fallback behavior, but the product contract and execution plan need stronger explicit AI-skip rules.
   - Improve state naming, logging, and admin copy so skipped AI is treated as expected behavior when configuration is absent or unhealthy.

2. **Form consistency gap**
   - Form surfaces are generally well-structured but need stricter cross-screen consistency for sectioning, helper text, validation visibility, and primary action placement.

3. **Accordion/disclosure gap**
   - Long forms need clearer disclosure patterns with summary state, error state, and auto-open behavior for invalid sections.

4. **Button-height consistency gap**
   - Buttons should be normalized under one shared sizing contract across modal triggers, inline actions, footer actions, and destructive actions.

5. **Modal editing flow gap**
   - Modal forms should preserve context better, reduce hidden overflow friction, and keep action areas more stable during long edits.

6. **Performance hardening gap**
   - Dense admin screens should avoid unnecessary render churn and over-nested component structure.

## Implementation Instructions

1. Review the full repo against `app-write-up.md` and `dev-plan/*`.
2. Update runtime behavior where needed so AI failure or AI misconfiguration never blocks valid non-AI workflows.
3. Update admin UX primitives so forms and modals behave consistently.
4. Refactor accordion-like sections into a reusable, accessible pattern where beneficial.
5. Standardize shared button sizing tokens and migrate inconsistent usages.
6. Improve inline validation and submit-failure recovery across forms.
7. Reduce duplication and simplify component structure without changing product scope.
8. Update JSDoc for every changed exported function, component, route handler, action, formatter, and workflow helper.
9. Update or add tests covering:
   - AI disabled
   - AI misconfigured
   - AI timeout
   - invalid AI structured output
   - deterministic fallback
   - skipped-AI admin visibility
   - accordion auto-open on validation failure
   - shared button-height behavior where testable
10. Update `README.md`, `app-write-up.md`, and the relevant `dev-plan` files so the docs match the implemented behavior exactly.

## Acceptance Criteria

The work is complete only if:

- AI failure or configuration failure causes AI intervention to be skipped rather than blocking the app
- deterministic fallback or manual editorial flow remains usable
- admin logs and review surfaces clearly show skipped or fallback AI states
- all major forms feel consistent, faster, and easier to complete
- accordion sections are clearer, accessible, and error-aware
- button heights are uniform across the admin app
- modal forms support seamless editing
- changed runtime code is documented with professional JSDoc
- tests and docs reflect the real implementation