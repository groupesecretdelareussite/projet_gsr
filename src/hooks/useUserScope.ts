"use client";

import { useContext } from "react";
import { ScopeContext } from "@/components/admin/ScopeProvider";

export function useUserScope() {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error("useUserScope() doit être utilisé sous <ScopeProvider>");
  return scope;
}
