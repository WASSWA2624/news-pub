import { createSlice } from "@reduxjs/toolkit";

const commentModerationSlice = createSlice({
  name: "commentModeration",
  initialState: {
    query: "",
    selectedIds: [],
    statusFilter: "pending",
  },
  reducers: {
    setCommentModerationState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setCommentModerationState } = commentModerationSlice.actions;

export default commentModerationSlice.reducer;
