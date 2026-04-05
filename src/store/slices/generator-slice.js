import { createSlice } from "@reduxjs/toolkit";

import { generationRequestDefaults } from "@/lib/validation";

const initialState = {
  articleDepth: generationRequestDefaults.articleDepth,
  currentStage: "idle",
  duplicateDecision: null,
  duplicateMatch: null,
  equipmentName: "",
  error: null,
  includeFaults: generationRequestDefaults.includeFaults,
  includeImages: generationRequestDefaults.includeImages,
  includeManualLinks: generationRequestDefaults.includeManualLinks,
  includeManufacturers: generationRequestDefaults.includeManufacturers,
  includeModels: generationRequestDefaults.includeModels,
  jobId: null,
  loading: false,
  locale: generationRequestDefaults.locale,
  preview: null,
  progress: 0,
  replaceExistingPost: generationRequestDefaults.replaceExistingPost,
  resultPostId: null,
  schedulePublishAt: generationRequestDefaults.schedulePublishAt,
  selectedProviderConfigId: null,
  status: "idle",
  targetAudience: [...generationRequestDefaults.targetAudience],
  warnings: [],
};

const generatorSlice = createSlice({
  name: "generator",
  initialState,
  reducers: {
    resetGeneratorState() {
      return initialState;
    },
    setGeneratorState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { resetGeneratorState, setGeneratorState } = generatorSlice.actions;

export default generatorSlice.reducer;
