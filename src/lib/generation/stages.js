export const generationStageOrder = Object.freeze([
  "duplicate_check",
  "composing_draft",
  "saving_draft",
  "draft_saved",
]);

export const generationTerminalStageIds = Object.freeze({
  duplicateCheckBlocked: "duplicate_check_blocked",
  failed: "failed",
});

const knownStageIds = new Set([
  ...generationStageOrder,
  ...Object.values(generationTerminalStageIds),
]);

export function getGenerationStageIndex(stageId) {
  return generationStageOrder.indexOf(stageId);
}

export function isKnownGenerationStage(stageId) {
  return knownStageIds.has(stageId);
}
