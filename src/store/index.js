import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/slices/auth-slice";
import draftEditorReducer from "@/store/slices/draft-editor-slice";
import localeReducer from "@/store/slices/locale-slice";
import mediaLibraryReducer from "@/store/slices/media-library-slice";
import settingsReducer from "@/store/slices/settings-slice";
import uiReducer from "@/store/slices/ui-slice";

/**
 * Configures the client-side Redux store used by the NewsPub admin workspace.
 */
export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      draftEditor: draftEditorReducer,
      locale: localeReducer,
      mediaLibrary: mediaLibraryReducer,
      settings: settingsReducer,
      ui: uiReducer,
    },
    preloadedState,
  });
}
