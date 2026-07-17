"use client";

import { createContext, type ReactNode } from "react";
import type { UserScope } from "@/lib/auth-scope";

export const ScopeContext = createContext<UserScope | null>(null);

export function ScopeProvider({ scope, children }: { scope: UserScope; children: ReactNode }) {
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}
