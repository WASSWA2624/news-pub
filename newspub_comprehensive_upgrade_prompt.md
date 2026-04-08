# NewsPub codebase gaps for default resets and admin form contrast

## Executive summary
The codebase already has **partial** reset flows (provider request defaults; stream provider filters), but resets are **inconsistent across form sections** and at least one reset control appears **non-functional for uncontrolled fields**. The admin form/accordion styling relies on **very low-contrast borders** and **subtle focus rings**, which likely undermines both visual clarity and WCAG-aligned non-text contrast/focus visibility. citeturn2search1turn1search0turn1search1

## Relevant repo touchpoints found
The project is **Next.js** (`next.config.mjs`) with **React** and **styled-components** (`styled-components` dependency) and **Vitest** (`vitest.config.mjs`, existing unit tests). Defaults, forms, and UI surfaces for the admin experience are primarily here:
- **Provider form**: `src/components/admin/provider-form-card.js`
- **Stream form**: `src/components/admin/stream-form-card.js`
- **Accordion/disclosure**: `src/components/admin/admin-form-primitives.js`
- **Admin UI primitives (inputs, cards, sections)**: `src/components/admin/news-admin-ui.js`
- **Global tokens and base focus outline**: `src/app/globals.js`
- **Shared focus/surface CSS fragments**: `src/components/common/ui-surface.js`
- **Modal surface styling**: `src/components/admin/admin-form-modal.js`
- **Provider/stream “default” data and sanitisation**:
  - Provider defs & defaults: `src/lib/news/provider-definitions.js`
  - Stream persistence sanitisation: `src/features/streams/index.js`
  - Provider persistence sanitisation: `src/features/providers/index.js`

## Gaps to implement resetting stream and provider defaults
- **Provider notes reset button does not reliably reset the notes textarea (uncontrolled input not remounted).**  
  **File**: `src/components/admin/provider-form-card.js`  
  **What’s happening**: The “Provider notes” section’s reset handler increments `metadataResetKey`, but the `<Textarea defaultValue={nextDescription} ... />` is **not keyed** to that reset token. In React, `defaultValue` is only the initial value for uncontrolled inputs; re-rendering alone does not reset the user-edited value. citeturn3search1  
  **Gap to implement**: Ensure the notes textarea subtree remounts on reset, or implement a section-scoped reset using the form API.  
  **Minimal code-change suggestion (keyed remount, matching existing pattern used for other sections):**
  ```jsx
  // In Provider notes section:
  <Field key={`provider-notes-${providerKey}-${metadataResetKey}`}>
    <FieldLabel>Description</FieldLabel>
    <Textarea defaultValue={nextDescription} name="description" />
    ...
  </Field>
  ```
  **Accessibility notes**: No ARIA change required; this is behavioural correctness for reset.

- **Provider availability flags (Enabled/Selectable/Default) have no “reset to saved defaults” affordance (reset coverage is inconsistent across sections).**  
  **File**: `src/components/admin/provider-form-card.js`  
  **Gap to implement**: Add a reset control for the “Availability” section to revert unsaved checkbox edits (or add a single “Reset provider form” action that resets all sections).  
  **Suggested approach (section-scoped remount, consistent with existing reset-key usage):**
  ```jsx
  const [availabilityResetKey, setAvailabilityResetKey] = useState(0);

  // Add button:
  <SecondaryButton type="button" onClick={() => setAvailabilityResetKey(v => v + 1)}>
    <ButtonIcon><ActionIcon name="refresh" /></ButtonIcon>
    Reset availability
  </SecondaryButton>

  // Key the toggle row:
  <ToggleRow key={`provider-availability-${providerKey}-${availabilityResetKey}`}>
    ...
  </ToggleRow>
  ```
  **Migration note**: No DB migration; this is UI-only.

- **Stream form lacks a “reset stream defaults” capability across core setup, scheduling, targeting, and categories.**  
  **File**: `src/components/admin/stream-form-card.js`  
  **Current state**: Only “Provider request filters” has a reset (“Reset to provider defaults”), and fetch-window controls have an internal reset hook. The rest of the stream form (core setup, scheduling/limits, social options, targeting rules, categories) has no reset affordance.  
  **Gap to implement**: Add a **single “Reset stream form”** action (recommended for consistency) or add **per-section resets**. Because the form mixes controlled state and uncontrolled `defaultValue` fields, a robust reset needs to cover both. React uncontrolled defaults and native form resets behave predictably only relative to the initial defaults. citeturn3search0turn3search1  
  **Recommended implementation (single global reset, minimal cognitive load):**
  - Capture initial seeds once (ref) for controlled state and provider filter seed values.
  - On reset: call `formRef.current?.reset()` for native inputs, reset controlled state, reset provider filter state, and bump the provider filter remount key.

  **Concrete code sketch (fits current conventions):**
  ```jsx
  // near existing useState initialisations
  const initialSeedRef = useRef({
    name: initialName,
    slug: initialSlug,
    activeProviderId: initialActiveProviderId,
    destinationId: initialDestinationId,
    defaultTemplateId: stream?.defaultTemplateId || "",
    mode: stream?.mode || initialSuggestedMode,
    status: stream?.status || "ACTIVE",
    maxPostsPerRun: `${stream?.maxPostsPerRun ?? 5}`,
    postLinkPlacement: socialPostSettings.linkPlacement,
    providerFormValues: initialProviderFormValues,
  });

  function resetStreamFormDefaults() {
    const seed = initialSeedRef.current;

    formRef.current?.reset();                 // resets uncontrolled <Input defaultValue=...> and <Textarea defaultValue=...>
    setName(seed.name);
    setSlug(seed.slug);
    setActiveProviderId(seed.activeProviderId);
    setDestinationId(seed.destinationId);
    setDefaultTemplateId(seed.defaultTemplateId);
    setMode(seed.mode);
    setStatus(seed.status);
    setMaxPostsPerRun(seed.maxPostsPerRun);
    setPostLinkPlacement(seed.postLinkPlacement);
    setProviderFormValues(seed.providerFormValues);
    setProviderFiltersResetKey(v => v + 1);   // remount ProviderFilterFields to reset internal uncontrolled inputs
  }
  ```
  **UI gap**: Add a button (likely in the footer or top of “Core setup” section) that calls `resetStreamFormDefaults()`.

  **Accessibility notes**:
  - Ensure reset buttons are `type="button"` and labelled clearly (already consistent).
  - Reset behaviour should not trap focus; optionally return focus to the first field in the section after reset.

- **Optional but high-value: “Factory reset” persisted defaults back to provider registry defaults is not discoverable (and likely not possible without manual edits).**  
  **Files**:  
  - Registry defaults exist: `src/lib/news/provider-definitions.js` (`defaultRequestDefaults`)  
  - Provider persistence: `src/features/providers/index.js`  
  - Admin action surface: `src/app/admin/actions.js`  
  **Gap to implement** (only if “reset defaults” means revert the *saved record*, not just unsaved edits):  
  - Add a dedicated server action (e.g., `resetProviderDefaultsAction`) that overwrites a provider’s `requestDefaultsJson` with the registry `defaultRequestDefaults` for its `providerKey`.
  - Provide a button in the provider modal that calls this action (or prefills + requires Save, but that’s less “reset” and more “edit”).  
  **Why this is distinct**: Current provider reset controls revert the current form to whatever `provider` already contains; if the persisted provider defaults drift, the UI cannot restore registry defaults without bespoke logic.

### Reset flow mermaid diagram
```mermaid
flowchart TD
  A[User clicks Reset] --> B{Which form?}

  B -->|Provider form| C[Compute reset target\n(saved seed or registry defaults)]
  C --> D[Reset uncontrolled fields\n(remount keyed subtree OR form.reset())]
  D --> E[Reset controlled state\n(providerKey etc)]
  E --> F[Increment section reset keys\n(metadataResetKey, requestDefaultsResetKey, availabilityResetKey)]
  F --> G[User optionally clicks Save\n(server action persists)]

  B -->|Stream form| H[Load initial seed from ref\n(initialName/slug/etc)]
  H --> I[formRef.reset() for uncontrolled inputs]
  I --> J[Reset controlled state\n(name/slug/providerId/etc)]
  J --> K[Reset provider form values + bump providerFiltersResetKey]
  K --> L[User optionally clicks Save\n(server action persists)]
```

## Gaps to improve form and accordion visual distinction and focus accessibility
### Contrast and boundaries that are currently too subtle
- **Admin inputs (Input/Select/Textarea) use an extremely low-contrast border**.  
  **File**: `src/components/admin/news-admin-ui.js`  
  **Current code** (fieldStyles): `border: 1px solid rgba(16, 32, 51, 0.12);` plus `outline: none` on focus. This border is likely well below the 3:1 contrast expectation for UI component boundaries in WCAG non-text contrast. citeturn2search1  
- **Admin card and accordion borders are also very subtle** (multiple places use `rgba(16, 32, 51, 0.08)` / `0.09`).  
  **Files**:
  - `src/components/admin/news-admin-ui.js` (`Card` border)
  - `src/components/admin/admin-form-primitives.js` (`DisclosureCard`, `DisclosureBody`)
  - `src/components/admin/admin-form-modal.js` (`Surface` border)
- **Accordion panels lack an accessible name association**: `role="region"` is present, but `aria-labelledby` linking the region to its controlling button is missing. This is part of the WAI-ARIA accordion guidance (and improves SR navigation when a region role is used). citeturn2search2turn2search5
- **Focus styles rely heavily on low-alpha box-shadows and often remove outlines**, which can be risky in forced-colours/high-contrast modes where box-shadows may be suppressed. citeturn0search3turn1search0turn1search1

### Current vs proposed styling changes
| UI element | Current (observed) | Gap | Proposed change (minimum viable) | A11y target |
|---|---|---|---|---|
| Inputs (`Input`, `Select`, `Textarea`) | `border: 1px solid rgba(16, 32, 51, 0.12)` in `fieldStyles` | Boundary likely fails non-text contrast expectations for controls | Increase border contrast (e.g. tie to `--theme-text-rgb` alpha) and add hover border darkening | WCAG 1.4.11 3:1 for component boundary citeturn2search13 |
| Focus ring (`focusRingCss`) | Low-alpha box-shadow + `outline: none` | Potentially weak focus visibility; forced-colours risk | Add explicit `outline` (keep box-shadow), add forced-colours fallback | WCAG 2.4.7 (AA) and stronger best-practice via 2.4.13 (AAA) citeturn1search0turn1search1turn0search3 |
| Accordion toggle (`DisclosureToggle`) | `border: none; background: transparent;` focus uses subtle inset shadow | Toggle blends into background; focus indicator may be too subtle | Give toggle a subtle background + border to define control surface; reuse focusRingCss | WCAG 2.4.7 focus visibility citeturn1search0 |
| Accordion panel region (`DisclosureBody`) | `role="region"` without `aria-labelledby` | Region is unnamed for SR users | Add `id` to button + `aria-labelledby` on region | ARIA APG accordion guidance citeturn2search2turn2search5 |

### Precise code change suggestions
- **Strengthen input borders and focus states (admin controls).**  
  **File**: `src/components/admin/news-admin-ui.js` (`fieldStyles`)  
  **Gap**: Border + focus appearance too subtle for clearly delineated inputs and strong keyboard focus. citeturn2search13turn1search0turn1search1  
  **Suggested rules (styled-components `css` fragment; adjust tokens as needed):**
  ```js
  // fieldStyles in src/components/admin/news-admin-ui.js
  const fieldStyles = css`
    ${controlSurfaceCss}
    ${focusRingCss}

    /* stronger boundary */
    border: 1px solid rgba(var(--theme-text-rgb), 0.5);

    &:hover {
      border-color: rgba(var(--theme-text-rgb), 0.62);
    }

    &[aria-invalid="true"] {
      border-color: rgba(var(--theme-danger-rgb), 0.7);
      /* keep existing error shadow if desired */
    }
  `;
  ```
  **Accessibility considerations**:
  - Aim for **≥3:1** contrast for the input boundary against adjacent surfaces (non-text contrast). citeturn2search13
  - Ensure focus indicators remain visible and discernible for keyboard users. citeturn1search0turn1search1

- **Make focus rings resilient in forced-colours mode.**  
  **File**: `src/components/common/ui-surface.js` (`focusRingCss`)  
  **Gap**: Current focus ring uses box-shadow and removes outline; forced-colours modes can suppress box shadows. citeturn0search3turn1search0  
  **Suggested update (keep framework conventions):**
  ```js
  export const focusRingCss = css`
    &:focus-visible,
    &:focus-within {
      border-color: rgba(var(--theme-primary-rgb), 0.75);
      box-shadow:
        var(--theme-shadow-sm),
        0 0 0 4px rgba(var(--theme-primary-rgb), 0.22);

      /* explicit outline for clarity (and as a fallback) */
      outline: 2px solid rgba(var(--theme-primary-rgb), 0.85);
      outline-offset: 2px;
    }

    @media (forced-colors: active) {
      &:focus-visible,
      &:focus-within {
        outline: 2px solid CanvasText;
        box-shadow: none;
      }
    }
  `;
  ```
  **Accessibility considerations**:
  - Focus indicator must be visible (AA) and ideally meet stronger appearance guidance (thickness/contrast) for best practice. citeturn1search0turn1search1
  - Forced-colours handling is explicitly supported via `@media (forced-colors: active)`. citeturn0search3

- **Give accordion toggles and containers clearer separation from background, and improve ARIA linkage.**  
  **File**: `src/components/admin/admin-form-primitives.js`  
  **Visual gap**: Borders are very low contrast (`rgba(..., 0.08)`); toggle blends into background (transparent, borderless).  
  **ARIA gap**: `role="region"` is present, but `aria-labelledby` is missing. citeturn2search2turn2search5  
  **Suggested changes (minimal + targeted):**
  ```jsx
  // AdminDisclosureSection: add an id for the toggle and link the region
  <DisclosureToggle
    id={toggleId}                 // new
    aria-controls={bodyId}
    aria-expanded={resolvedOpen}
    ...
  />

  <DisclosureBody
    id={bodyId}
    role="region"
    aria-labelledby={toggleId}    // new
    ...
  />
  ```
  ```js
  // DisclosureToggle styling: define a surface + reuse focusRingCss
  const DisclosureToggle = styled.button`
    ${focusRingCss}
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(var(--theme-text-rgb), 0.16);
    ...
  `;

  // DisclosureCard / DisclosureBody borders: increase contrast slightly
  const DisclosureCard = styled.section`
    border: 1px solid rgba(var(--theme-text-rgb), 0.14);
    ...
  `;

  const DisclosureBody = styled.div`
    border-top: 1px solid rgba(var(--theme-text-rgb), 0.14);
    ...
  `;
  ```
  **Accessibility considerations**:
  - ARIA accordion pattern guidance recommends associating the panel (region) with its controlling button via `aria-labelledby` when using `role="region"`. citeturn2search2turn2search5  
  - Ensure toggle focus is obvious and consistent across the admin UI. citeturn1search0turn1search1

### Sample CSS snippet
```css
/* Use this as the design target for admin inputs and accordions. */

:root {
  /* Example: strengthen borders without changing theme palette. */
  --admin-control-border: rgba(var(--theme-text-rgb), 0.5);
  --admin-surface-border: rgba(var(--theme-text-rgb), 0.14);
}

.admin-control {
  border: 1px solid var(--admin-control-border);
}

.admin-control:focus-visible {
  outline: 2px solid rgba(var(--theme-primary-rgb), 0.85);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.22);
}

@media (forced-colors: active) {
  .admin-control:focus-visible {
    outline: 2px solid CanvasText;
    box-shadow: none;
  }
}
```

## Tests to add
- **Reset behaviour (unit-testable without a browser) by extracting reset seed logic into pure helpers.**  
  **Files**:
  - Add helper exports in `src/components/admin/stream-form-card.js` (or a new `stream-form-card.helpers.js`) for:
    - building an initial seed snapshot
    - applying reset seed to state setters (can be tested via spies)
  - Add tests in a new `src/components/admin/stream-form-card.test.js` (Vitest)
  **Gap**: There are currently no component-level tests validating reset behaviour, and the form mixes controlled/uncontrolled inputs, which is easy to regress.

- **ARIA linkage for accordions (structural test).**  
  **File**: `src/components/admin/admin-form-primitives.js`  
  **Gap**: No tests ensure `role="region"` panels are named via `aria-labelledby`.  
  **Test idea**: After refactoring to export `AdminDisclosureSection`, add a lightweight render test (may require adding a minimal DOM environment or a small test renderer setup) that asserts:
  - button has `aria-controls` and stable `id`
  - region has matching `id` and `aria-labelledby` referencing the button id  
  **Reference**: APG accordion guidance. citeturn2search2turn2search5

- **Server-action reset tests only if you implement persistent “factory reset” actions.**  
  **Files**:
  - `src/app/admin/actions.js` (new reset actions)
  - `src/app/admin/actions.test.js` (add cases similar to existing save/delete tests)
  **Gap**: No coverage ensures reset actions call the correct feature service methods with the expected payload and redirects.

## Migration and rollout notes
- **UI-only reset buttons** (using remount keys and/or `formRef.current.reset()`): no schema migrations; low operational risk. Note that `HTMLFormElement.reset()` restores *initial* default values (equivalent to `<input type="reset">`), which is correct for “discard unsaved changes” but not a substitute for “factory reset saved record defaults” without additional persistence logic. citeturn3search0  
- **If you change focus ring behaviour globally (`focusRingCss`)**, it will affect more than stream/provider forms (every component that composes that fragment). Plan a quick visual QA sweep across all admin routes.  
- **Accessibility validation to run after styling changes**:
  - Confirm **input boundaries** and **focus indicators** are clearly visible at 200% zoom and in forced-colours/high-contrast modes. citeturn2search13turn0search3turn1search0
  - Ensure focus indicators meet “visible” (AA) and aim for stronger appearance characteristics as best practice. citeturn1search0turn1search1
  - If keeping `role="region"` on accordion panels, link them with `aria-labelledby` to avoid unnamed regions. citeturn2search2turn2search5