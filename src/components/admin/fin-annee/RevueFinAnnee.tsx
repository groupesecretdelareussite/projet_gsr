"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { annulerRevueFinAnnee, enregistrerDecisionPassage } from "@/actions/fin-annee";
import { DECISION_PASSAGE_LABELS, type DecisionPassage } from "@/lib/constants";
import type { ClasseOption } from "@/components/admin/parametres/NouvelleClasseDialog";
import { ValiderFinAnneeDialog } from "./ValiderFinAnneeDialog";

export interface EleveRef {
  id: number;
  nom: string;
  prenoms: string;
  matricule: string;
}
export interface GroupeClasse {
  classeId: number;
  nomClasse: string;
  nomSite: string;
  ordre: number;
  classeSuivanteId: number | null;
  eleves: EleveRef[];
}
export interface DecisionExistante {
  eleve_id: number;
  decision: DecisionPassage;
  nouvelle_classe_id: number | null;
}
export type EleveSuspenduRef = EleveRef;

type StatutLigne = "idle" | "saving" | "saved" | "error";

export function RevueFinAnnee({
  groupes,
  decisionsExistantes,
  classesOptions,
  elevesSuspendus,
  totalActifs,
  anneeEnPause,
}: {
  groupes: GroupeClasse[];
  decisionsExistantes: DecisionExistante[];
  classesOptions: ClasseOption[];
  elevesSuspendus: EleveSuspenduRef[];
  totalActifs: number;
  anneeEnPause: { libelle: string; dateFin: string };
}) {
  const [decisions, setDecisions] = useState<Record<number, { decision: DecisionPassage; nouvelleClasseId: number | null }>>(
    () => Object.fromEntries(decisionsExistantes.map((d) => [d.eleve_id, { decision: d.decision, nouvelleClasseId: d.nouvelle_classe_id }]))
  );
  const [statuts, setStatuts] = useState<Record<number, StatutLigne>>({});
  const [isPending, startTransition] = useTransition();
  const [annulPending, startAnnulTransition] = useTransition();
  const router = useRouter();

  const classesParId = useMemo(() => new Map(classesOptions.map((c) => [c.id, c])), [classesOptions]);

  const enAttente = totalActifs - Object.keys(decisions).length;
  const nbPasse = Object.values(decisions).filter((d) => d.decision === "passe").length;
  const nbRedouble = Object.values(decisions).filter((d) => d.decision === "redouble").length;
  const nbSortant = Object.values(decisions).filter((d) => d.decision === "sortant").length;

  function appliquerDecision(eleveId: number, decision: DecisionPassage, nouvelleClasseId: number | null) {
    setDecisions((prev) => ({ ...prev, [eleveId]: { decision, nouvelleClasseId } }));
    setStatuts((prev) => ({ ...prev, [eleveId]: "saving" }));
    startTransition(async () => {
      const result = await enregistrerDecisionPassage({ eleveId, decision, nouvelleClasseId });
      if (result.error) {
        toast.error(result.error);
        setStatuts((prev) => ({ ...prev, [eleveId]: "error" }));
        return;
      }
      setStatuts((prev) => ({ ...prev, [eleveId]: "saved" }));
    });
  }

  function handleAnnuler() {
    if (!window.confirm("Annuler la revue ? Toutes les décisions déjà saisies seront perdues.")) return;
    startAnnulTransition(async () => {
      const result = await annulerRevueFinAnnee();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Revue annulée");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {elevesSuspendus.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {elevesSuspendus.length} élève(s) encore suspendu(s) — seront supprimés définitivement à la
                validation
              </p>
              <p className="text-sm text-red-600 mt-1">
                Réinscrivez-les depuis Élèves &gt; Suspendus avant de valider, si vous voulez les conserver.
              </p>
              <p className="text-xs text-red-500 mt-2">
                {elevesSuspendus.map((e) => `${e.nom} ${e.prenoms} (${e.matricule})`).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {groupes.map((groupe) => (
        <div key={groupe.classeId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-primary/15 to-primary/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-dark">
              {groupe.nomClasse} ({groupe.nomSite}) — {groupe.eleves.length} élève{groupe.eleves.length > 1 ? "s" : ""}
            </h3>
            {groupe.classeSuivanteId ? (
              <span className="text-xs text-gray-500">
                → {classesParId.get(groupe.classeSuivanteId)?.nom_classe ?? "?"} ({classesParId.get(groupe.classeSuivanteId)?.nom_site ?? "?"})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" /> Point de décision
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {groupe.eleves.map((eleve) => {
              const decision = decisions[eleve.id];
              const statut = statuts[eleve.id] ?? "idle";
              const selectValue = decision ? (decision.decision === "passe" ? `classe:${decision.nouvelleClasseId}` : decision.decision) : "";

              return (
                <div key={eleve.id} className="px-5 py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm text-gray-700">
                      {eleve.nom} {eleve.prenoms}
                    </span>{" "}
                    <span className="text-gray-400 font-mono text-xs">{eleve.matricule}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statut === "saving" && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                    {statut === "saved" && <Check className="w-3.5 h-3.5 text-green-500" />}
                    {!decision && (
                      <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">Choix requis</span>
                    )}
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "redouble" || value === "sortant") {
                          appliquerDecision(eleve.id, value, null);
                        } else if (value.startsWith("classe:")) {
                          appliquerDecision(eleve.id, "passe", Number(value.slice("classe:".length)));
                        }
                      }}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groupe.classeSuivanteId ? (
                          <SelectItem value={`classe:${groupe.classeSuivanteId}`}>
                            {DECISION_PASSAGE_LABELS.passe} → {classesParId.get(groupe.classeSuivanteId)?.nom_classe}
                          </SelectItem>
                        ) : (
                          classesOptions.map((c) => (
                            <SelectItem key={c.id} value={`classe:${c.id}`}>
                              {DECISION_PASSAGE_LABELS.passe} → {c.nom_classe} ({c.nom_site})
                            </SelectItem>
                          ))
                        )}
                        <SelectItem value="redouble">{DECISION_PASSAGE_LABELS.redouble}</SelectItem>
                        {!groupe.classeSuivanteId && <SelectItem value="sortant">{DECISION_PASSAGE_LABELS.sortant}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-500">
            <strong className="text-gray-800">{totalActifs}</strong> élèves actifs
          </span>
          <span className="text-green-600">
            <strong>{nbPasse}</strong> passent
          </span>
          <span className="text-blue-600">
            <strong>{nbRedouble}</strong> redoublent
          </span>
          <span className="text-red-600">
            <strong>{nbSortant}</strong> sortent définitivement
          </span>
          {enAttente > 0 && (
            <span className="text-amber-600 font-semibold">
              <strong>{enAttente}</strong> en attente de décision
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={handleAnnuler} disabled={annulPending || isPending}>
            {annulPending ? "Annulation..." : "Annuler la revue"}
          </Button>
          <ValiderFinAnneeDialog
            disabled={enAttente > 0 || isPending}
            enAttente={enAttente}
            nbPasse={nbPasse}
            nbRedouble={nbRedouble}
            nbSortant={nbSortant}
            nbSuspendus={elevesSuspendus.length}
            anneeActuelle={anneeEnPause}
          />
        </div>
      </div>
    </div>
  );
}
