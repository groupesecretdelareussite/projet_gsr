"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Maximize2, Bot } from "lucide-react";
import { useUserScope } from "@/hooks/useUserScope";
import { ChatContainer } from "./ChatContainer";
import { cn } from "@/lib/utils";

const ROLES_AGENT_IA = ["coordonnateur", "comptable", "superviseur"];

export function FloatingAgentWidget() {
  const scope = useUserScope();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Fermer le tiroir si la touche Échap est pressée
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Si l'utilisateur n'a pas le rôle requis, ne rien afficher
  if (!ROLES_AGENT_IA.includes(scope.role)) {
    return null;
  }

  // Ne pas afficher le bouton flottant si l'utilisateur est déjà sur la page dédiée /admin/agent-ia
  if (pathname.startsWith("/admin/agent-ia")) {
    return null;
  }

  return (
    <>
      {/* Bouton d'action flottant (FAB) */}
      <aside aria-label="Widget Assistant IA GSR" className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-primary-gradient text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          title="Ouvrir l'Assistant IA GSR"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary ring-2 ring-white" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline tracking-wide">
            Assistant IA
          </span>
        </button>
      </aside>

      {/* Tiroir latéral (Drawer) coulissant */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Arrière-plan assombri cliquable */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <div className="w-screen max-w-md sm:max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300">
              {/* En-tête du tiroir */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary-gradient text-white border-b border-primary-dark">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <div>
                    <h2 className="font-bold text-sm sm:text-base leading-tight">
                      Assistant IA GSR
                    </h2>
                    <p className="text-[11px] text-white/80">
                      Consultation rapide · Lecture seule
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href="/admin/agent-ia"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
                    title="Ouvrir en plein écran"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
                    title="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenu du Chat */}
              <div className="flex-1 p-3 min-h-0 bg-slate-50">
                <ChatContainer isCompact={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
