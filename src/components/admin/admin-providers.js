"use client";

import StoreProvider from "@/store/provider";

export default function AdminProviders({ children }) {
  return <StoreProvider>{children}</StoreProvider>;
}
