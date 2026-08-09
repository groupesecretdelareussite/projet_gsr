import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Enrobe une nav/barre d'onglets en `overflow-x-auto` d'un dégradé de fondu
 * au bord droit — seul indice visuel qu'il y a plus de contenu à faire
 * défiler (sans lui, rien ne le suggère sur mobile/tablette, notamment sur
 * le portail TD où plusieurs items peuvent sortir du cadre). `fadeClassName`
 * doit correspondre à l'arrière-plan réel derrière l'enfant (ex. "from-surface"
 * si le parent est en `bg-surface`), sinon le dégradé tranche visuellement.
 */
export function ScrollFadeX({
  children,
  fadeClassName = "from-white",
  className,
}: {
  children: ReactNode;
  fadeClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent", fadeClassName)}
      />
    </div>
  );
}
