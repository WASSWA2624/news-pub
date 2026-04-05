import { generationRequestDefaults, parseGenerationRequest, safeParseGenerationRequest } from "@/lib/validation";

export const adminGenerationFormDefaults = Object.freeze({
  ...generationRequestDefaults,
  equipmentName: "",
  providerConfigId: "",
});

export function createAdminGenerationFormState(overrides = {}) {
  return {
    ...adminGenerationFormDefaults,
    ...overrides,
    targetAudience: Array.isArray(overrides.targetAudience)
      ? [...overrides.targetAudience]
      : [...generationRequestDefaults.targetAudience],
  };
}

export function parseAdminGenerationInput(input, options) {
  return parseGenerationRequest(input, options);
}

export function validateAdminGenerationInput(input, options) {
  return safeParseGenerationRequest(input, options);
}
