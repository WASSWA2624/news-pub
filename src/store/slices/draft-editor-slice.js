import { createSlice } from "@reduxjs/toolkit";

const draftEditorSlice = createSlice({
  name: "draftEditor",
  initialState: {
    activePostId: null,
    dirtyFields: [],
    saveState: "idle",
  },
  reducers: {
    setDraftEditorState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setDraftEditorState } = draftEditorSlice.actions;

export default draftEditorSlice.reducer;
