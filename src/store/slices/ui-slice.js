import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    activeView: null,
    notices: [],
    sidebarOpen: true,
  },
  reducers: {
    setUiState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setUiState } = uiSlice.actions;

export default uiSlice.reducer;
