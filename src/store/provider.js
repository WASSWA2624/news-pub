"use client";

import { Provider } from "react-redux";
import { useState } from "react";

import { makeStore } from "@/store";

export default function StoreProvider({ children }) {
  const [store] = useState(() => makeStore());

  return <Provider store={store}>{children}</Provider>;
}
