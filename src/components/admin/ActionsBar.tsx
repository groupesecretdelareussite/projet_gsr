import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** §3.3 GSR_ARCHITECTURE.md — boutons en flexbox, label masqué sur mobile. */
export function ActionsBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2 mb-4", className)}>{children}</div>;
}

export function ActionsBarLabel({ children }: { children: ReactNode }) {
  return <span className="hidden sm:inline">{children}</span>;
}
