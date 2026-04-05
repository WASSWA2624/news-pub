import { createSlice } from "@reduxjs/toolkit";

const mediaLibrarySlice = createSlice({
  name: "mediaLibrary",
  initialState: {
    query: "",
    selectedAssetId: null,
    uploadState: "idle",
  },
  reducers: {
    setMediaLibraryState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setMediaLibraryState } = mediaLibrarySlice.actions;

export default mediaLibrarySlice.reducer;
