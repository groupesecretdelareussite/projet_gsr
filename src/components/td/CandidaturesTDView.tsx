"use client";

import { useState, useMemo } from "react";
import { Filter, Layers, GraduationCap, BookOpen, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { CandidatureButtonTD } from "@/components/td/CandidatureButtonTD";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MAX_CANDIDATURES_PAR_CRENEAU } from "@/lib/constants";

export interface CreneauItemTD {
  id: number;
  classeId: number;
  matiereId: number;
  nomClasse: string;
  nomMatiere: string;
  dateTd: string;
  heureDebut: string;
  heureFin: string;
  montantPrevu: number;
}

export interface MatiereOptionTD {
  id: number;
  nomMatiere: string;
}

export interface PostulationItemTD {
  id: number;
  statutValidation: "En attente" | "Valide" | "Refuse" | "Retiree" | string;
}

interface CandidaturesTDViewProps {
  creneaux: CreneauItemTD[];
  matieres: MatiereOptionTD[];
  matierePrincipaleId: number | null;
  matierePrincipaleNom: string | null;
  postulationParCreneau: Record<number, PostulationItemTD>;
  nombreCandidatsParCreneau: Record<number, number>;
}

const STATUT_BADGE: Record<string, { label: string; variant: "neutral" | "success" | "danger" }> = {
  "En attente": { label: "En attente", variant: "neutral" },
  Valide: { label: "Validée", variant: "success" },
  Refuse: { label: "Refusée", variant: "danger" },
  Retiree: { label: "Retirée par le coordonnateur", variant: "danger" },
};

export function CandidaturesTDView({
  creneaux,
  matieres,
  matierePrincipaleId,
  matierePrincipaleNom,
  postulationParCreneau,
  nombreCandidatsParCreneau,
}: CandidaturesTDViewProps) {
  // Filtre sélectionné : id de la matière ou "toutes"
  // Par défaut, matière principale du professeur si elle existe, sinon "toutes"
  const [matiereFiltre, setMatiereFiltre] = useState<number | "toutes">(() => {
    return matierePrincipaleId ?? "toutes";
  });

  // Calcul du nombre de créneaux par matière
  const countParMatiere = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of creneaux) {
      map.set(c.matiereId, (map.get(c.matiereId) ?? 0) + 1);
    }
    return map;
  }, [creneaux]);

  // Liste des matières autres que la matière principale
  const autresMatieres = useMemo(() => {
    return matieres.filter((m) => m.id !== matierePrincipaleId);
  }, [matieres, matierePrincipaleId]);

  // Filtrage effectif des créneaux
  const creneauxFiltres = useMemo(() => {
    if (matiereFiltre === "toutes") {
      return creneaux;
    }
    return creneaux.filter((c) => c.matiereId === matiereFiltre);
  }, [creneaux, matiereFiltre]);

  // Nom de la matière actuellement sélectionnée
  const matiereSelectionneeNom = useMemo(() => {
    if (matiereFiltre === "toutes") return "Toutes les matières";
    const found = matieres.find((m) => m.id === matiereFiltre);
    return found ? found.nomMatiere : "Matière sélectionnée";
  }, [matiereFiltre, matieres]);

  // Cas 1 : Aucun créneau ouvert du tout dans la semaine publiée
  if (creneaux.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucun créneau ouvert"
        description="Revenez lorsqu'une semaine sera publiée."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de filtres ergonomique */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">Filtrer par matière</p>
              <p className="text-xs text-gray-500">
                {creneauxFiltres.length} créneau{creneauxFiltres.length > 1 ? "x" : ""}{" "}
                {matiereFiltre === "toutes" ? "au total" : `en ${matiereSelectionneeNom}`}
              </p>
            </div>
          </div>

          {/* Menu déroulant complet pour sélectionner n'importe quelle matière */}
          <div className="w-full sm:w-64">
            <Select
              value={String(matiereFiltre)}
              onValueChange={(val) => {
                if (val === "toutes") {
                  setMatiereFiltre("toutes");
                } else {
                  setMatiereFiltre(Number(val));
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choisir une matière" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">
                  Toutes les matières ({creneaux.length})
                </SelectItem>
                {matierePrincipaleId && (
                  <SelectItem value={String(matierePrincipaleId)}>
                    ★ {matierePrincipaleNom ?? "Ma matière"} ({countParMatiere.get(matierePrincipaleId) ?? 0})
                  </SelectItem>
                )}
                {autresMatieres.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nomMatiere} ({countParMatiere.get(m.id) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Boutons d'accès rapide (Ma matière / Toutes les matières) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400 mr-1">Accès rapide :</span>
          {matierePrincipaleId && (
            <button
              type="button"
              onClick={() => setMatiereFiltre(matierePrincipaleId)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
                matiereFiltre === matierePrincipaleId
                  ? "bg-primary text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Ma matière ({matierePrincipaleNom})</span>
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  matiereFiltre === matierePrincipaleId
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                {countParMatiere.get(matierePrincipaleId) ?? 0}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMatiereFiltre("toutes")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
              matiereFiltre === "toutes"
                ? "bg-primary text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Toutes les matières</span>
            <span
              className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                matiereFiltre === "toutes"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              )}
            >
              {creneaux.length}
            </span>
          </button>
        </div>
      </div>

      {/* Cas 2 : Aucun créneau pour la matière sélectionnée */}
      {creneauxFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-lg mx-auto shadow-xs my-6">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-primary mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Aucun créneau ouvert en {matiereSelectionneeNom}
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            Il n&apos;y a aucun créneau programmé dans cette matière pour cette semaine. Vous pouvez consulter les créneaux des autres matières.
          </p>
          <Button
            variant="outline"
            onClick={() => setMatiereFiltre("toutes")}
            className="gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Voir toutes les matières ({creneaux.length})
          </Button>
        </div>
      ) : (
        /* Cas 3 : Liste des créneaux filtrés */
        <div className="space-y-2">
          {creneauxFiltres.map((c) => {
            const maPostulation = postulationParCreneau[c.id];
            const badge = maPostulation ? STATUT_BADGE[maPostulation.statutValidation] : null;
            const estMatiereDifferente = matierePrincipaleId !== null && c.matiereId !== matierePrincipaleId;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs transition hover:border-gray-200"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">
                      {c.nomClasse} — {c.nomMatiere}
                    </p>
                    {estMatiereDifferente && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Autre discipline
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.dateTd).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    · {c.heureDebut.slice(0, 5)}–{c.heureFin.slice(0, 5)} ·{" "}
                    {Number(c.montantPrevu).toLocaleString("fr-FR")} F
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                  <CandidatureButtonTD
                    creneauId={c.id}
                    postulationId={maPostulation?.id ?? null}
                    statutValidation={maPostulation?.statutValidation ?? null}
                    estComplet={(nombreCandidatsParCreneau[c.id] ?? 0) >= MAX_CANDIDATURES_PAR_CRENEAU}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
