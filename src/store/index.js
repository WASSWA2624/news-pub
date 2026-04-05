import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/slices/auth-slice";
import commentModerationReducer from "@/store/slices/comment-moderation-slice";
import draftEditorReducer from "@/store/slices/draft-editor-slice";
import generatorReducer from "@/store/slices/generator-slice";
import localeReducer from "@/store/slices/locale-slice";
import mediaLibraryReducer from "@/store/slices/media-library-slice";
import settingsReducer from "@/store/slices/settings-slice";
import uiReducer from "@/store/slices/ui-slice";

export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      commentModeration: commentModerationReducer,
      draftEditor: draftEditorReducer,
      generator: generatorReducer,
      locale: localeReducer,
      mediaLibrary: mediaLibraryReducer,
      settings: settingsReducer,
      ui: uiReducer,
    },
    preloadedState,
  });
}
