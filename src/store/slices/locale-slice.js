import { createSlice } from "@reduxjs/toolkit";

import { defaultLocale, supportedLocales } from "@/features/i18n/config";

const localeSlice = createSlice({
  name: "locale",
  initialState: {
    currentLocale: defaultLocale,
    supportedLocales,
  },
  reducers: {
    setCurrentLocale(state, action) {
      state.currentLocale = action.payload;
    },
  },
});

export const { setCurrentLocale } = localeSlice.actions;

export default localeSlice.reducer;
