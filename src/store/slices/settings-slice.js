import { createSlice } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    activeTab: "general",
    lastSavedAt: null,
    provider_config_id: null,
  },
  reducers: {
    setSettingsState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setSettingsState } = settingsSlice.actions;

export default settingsSlice.reducer;
