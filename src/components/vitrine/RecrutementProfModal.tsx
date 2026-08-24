"use client";

import { useEffect, useState } from "react";
import { X, GraduationCap, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const SESSION_STORAGE_KEY = "gsr_recrutement_prof_popup_vu";
const LIEN_CANDIDATURE = "https://tally.so/r/RGyGlp";

export default function RecrutementProfModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Vérification de l'affichage unique par session
    try {
      const dejaAffiche = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dejaAffiche) {
        return;
      }
    } catch {
      // Ignorer si sessionStorage n'est pas accessible
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
      } catch {
        // Ignorer si sessionStorage n'est pas accessible
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recrutement-title"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture (Croix en haut à droite) */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Fermer la fenêtre"
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 sm:bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête avec dégradé et badge */}
        <div className="bg-gradient-to-br from-primary via-primary-dark to-emerald-950 p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Effets décoratifs de fond */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-24 h-24 bg-emerald-400/10 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Recrutement</span>
            </div>

            <div className="flex items-start gap-3 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
                <GraduationCap className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h2 id="modal-recrutement-title" className="text-xl sm:text-2xl font-extrabold leading-tight">
                  Rejoignez l&apos;équipe des professeurs GSR !
                </h2>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-1">
                  Année Académique 2026-2027
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Corps du modal */}
        <div className="p-6 sm:p-8 space-y-5">
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Vous êtes enseignant du secondaire ? Vous souhaitez accompagner nos élèves vers l&apos;excellence ?
          </p>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Matières scientifiques et littéraires</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Sites : <strong>Akpakpa, Jéricho, Vèdoko</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Séances de Travaux Dirigés (TD) et renforcement</span>
            </div>
          </div>

          {/* Bouton d'action principal */}
          <div className="pt-2">
            <a
              href={LIEN_CANDIDATURE}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-200 text-sm sm:text-base group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span>Postuler en tant que professeur</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
