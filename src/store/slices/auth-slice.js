import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    role: null,
    status: "signed_out",
    user: null,
  },
  reducers: {
    setAuthState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setAuthState } = authSlice.actions;

export default authSlice.reducer;
