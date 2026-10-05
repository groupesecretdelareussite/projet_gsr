"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, UserX, Pencil, CheckSquare, X, Trash2, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { ACTIONS_HOVER_REVEAL, cn } from "@/lib/utils";
import { SuspendreDialog } from "@/components/admin/eleves/SuspendreDialog";
import { ReinitialiserMotDePasseParentDialog } from "@/components/admin/eleves/ReinitialiserMotDePasseParentDialog";
import { SupprimerElevesDialog, type EleveCibleSuppression } from "@/components/admin/eleves/SupprimerElevesDialog";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { formaterNumeroAffichage } from "@/lib/telephone";

export interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  contact_parent: string | null;
  contact_parent_2: string | null;
  option_m: string | null;
  classes: { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
}

interface ExportConfig {
  titre: string;
  onExport: () => Promise<Record<string, string | number>[]>;
  nomFichier: string;
  nomFeuille?: string;
}

interface ElevesTableInteractiveProps {
  eleves: EleveRow[];
  peutGerer: boolean;
  estCoordonnateur: boolean;
  exportConfig?: ExportConfig;
  actionsBarExtras?: React.ReactNode;
}

export function ElevesTableInteractive({
  eleves,
  peutGerer,
  estCoordonnateur,
  exportConfig,
  actionsBarExtras,
}: ElevesTableInteractiveProps) {
  const [modeSelection, setModeSelection] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dialogGroupOpen, setDialogGroupOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  const toutEstCoche = eleves.length > 0 && selectedIds.size === eleves.length;

  function toggleTout() {
    if (toutEstCoche) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eleves.map((e) => e.id)));
    }
  }

  function toggleEleve(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function quitterModeSelection() {
    setModeSelection(false);
    setSelectedIds(new Set());
  }

  const elevesSelectionnesObjets: EleveCibleSuppression[] = useMemo(() => {
    return eleves
      .filter((e) => selectedIds.has(e.id))
      .map((e) => ({
        id: e.id,
        nom: e.nom,
        prenoms: e.prenoms,
        matricule: e.matricule,
        classe: e.classes?.nom_classe,
      }));
  }, [eleves, selectedIds]);

  return (
    <div className="space-y-3">
      {/* 1. Barre d'outils supérieure — Optimisée pour mobile et desktop */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-100">
        {/* Version Mobile : grille équilibrée de 3 colonnes */}
        <div className="grid grid-cols-3 gap-1.5 sm:hidden w-full">
          <Link href="/admin/eleves/suspendus" className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs px-1.5 h-8.5 justify-center text-gray-700"
            >
              <UserX className="w-3.5 h-3.5 mr-1 shrink-0" />
              Suspendus
            </Button>
          </Link>

          {peutGerer && exportConfig ? (
            <ExporterExcelButton
              titre={exportConfig.titre}
              onExport={exportConfig.onExport}
              nomFichier={exportConfig.nomFichier}
              nomFeuille={exportConfig.nomFeuille}
              label="Exporter"
              className="w-full text-xs px-1.5 h-8.5 justify-center"
            />
          ) : (
            <div className="hidden" />
          )}

          {estCoordonnateur && eleves.length > 0 ? (
            <Button
              variant={modeSelection ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (modeSelection) {
                  quitterModeSelection();
                } else {
                  setModeSelection(true);
                  setActiveCardId(null);
                }
              }}
              className={cn(
                "w-full text-xs px-1 h-8.5 justify-center",
                modeSelection
                  ? "bg-primary text-white border-primary"
                  : "text-gray-700 hover:text-primary hover:border-primary"
              )}
            >
              {modeSelection ? (
                <>
                  <X className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Quitter
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Sélectionner
                </>
              )}
            </Button>
          ) : (
            <div className="hidden" />
          )}
        </div>

        {/* Version Desktop / Tablette : disposition fluide horizontale */}
        <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/eleves/suspendus">
              <Button variant="outline" size="sm">
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                Élèves suspendus
              </Button>
            </Link>

            {peutGerer && exportConfig && (
              <ExporterExcelButton
                titre={exportConfig.titre}
                onExport={exportConfig.onExport}
                nomFichier={exportConfig.nomFichier}
                nomFeuille={exportConfig.nomFeuille}
                label="Exporter"
              />
            )}

            {actionsBarExtras}
          </div>

          {estCoordonnateur && eleves.length > 0 && (
            <div>
              {!modeSelection ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModeSelection(true)}
                  className="gap-1.5 text-gray-700 hover:text-primary hover:border-primary"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Sélection groupée
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={quitterModeSelection}
                  className="gap-1.5 text-gray-600 hover:text-gray-900"
                >
                  <X className="w-3.5 h-3.5" />
                  Quitter la sélection
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Tableau Desktop (md et supérieur) */}
      <div
        className={cn(
          "hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden",
          modeSelection && "ring-2 ring-primary/20"
        )}
      >
        {eleves.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun élève"
            description="Aucun élève ne correspond aux filtres actuels."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-primary/15 to-primary/5">
                <tr>
                  {modeSelection && (
                    <th className="px-4 py-3 text-left w-10">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          aria-label="Tout sélectionner sur cette page"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={toutEstCoche}
                          onChange={toggleTout}
                        />
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                    Matricule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                    Prénoms
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                    Classe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                    Site
                  </th>
                  {peutGerer && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                        Contact parent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                        Contact parent 2
                      </th>
                    </>
                  )}
                  {peutGerer && !modeSelection && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eleves.map((e) => {
                  const isSelected = selectedIds.has(e.id);
                  return (
                    <tr
                      key={e.id}
                      onClick={() => modeSelection && toggleEleve(e.id)}
                      className={cn(
                        "hover:bg-gray-50 group transition-colors",
                        modeSelection && "cursor-pointer",
                        modeSelection && isSelected && "bg-primary/5"
                      )}
                    >
                      {modeSelection && (
                        <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${e.nom} ${e.prenoms}`}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleEleve(e.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{e.matricule}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/eleves/${e.id}`}
                          className="font-medium text-gray-900 hover:text-primary hover:underline"
                        >
                          {e.nom}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.prenoms}</td>
                      <td className="px-4 py-3 text-gray-700">{e.classes?.nom_classe ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{e.classes?.sites?.nom_site ?? "—"}</td>
                      {peutGerer && (
                        <>
                          <td className="px-4 py-3 text-gray-700">
                            {formaterNumeroAffichage(e.contact_parent)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formaterNumeroAffichage(e.contact_parent_2)}
                          </td>
                        </>
                      )}
                      {peutGerer && !modeSelection && (
                        <td className="px-4 py-3 text-gray-700">
                          <div
                            className={cn(
                              "flex items-center gap-1.5 whitespace-nowrap",
                              ACTIONS_HOVER_REVEAL
                            )}
                          >
                            <Link href={`/admin/eleves/${e.id}/modifier`}>
                              <Button variant="outline" size="sm" title="Modifier">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <SuspendreDialog eleveId={e.id} nomComplet={`${e.nom} ${e.prenoms}`} />
                            {estCoordonnateur && (
                              <>
                                <ReinitialiserMotDePasseParentDialog
                                  matricule={e.matricule}
                                  nomComplet={`${e.nom} ${e.prenoms}`}
                                />
                                <SupprimerElevesDialog
                                  eleves={[
                                    {
                                      id: e.id,
                                      nom: e.nom,
                                      prenoms: e.prenoms,
                                      matricule: e.matricule,
                                      classe: e.classes?.nom_classe,
                                    },
                                  ]}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Version Mobile (Cartes interactives — Actions cachées par défaut et révélées au clic) */}
      <div
        className={cn(
          "md:hidden divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden",
          modeSelection && "ring-2 ring-primary/20"
        )}
      >
        {eleves.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun élève"
            description="Aucun élève ne correspond aux filtres actuels."
          />
        ) : (
          eleves.map((e) => {
            const isSelected = selectedIds.has(e.id);
            const isExpanded = activeCardId === e.id;

            return (
              <div
                key={e.id}
                onClick={() => {
                  if (modeSelection) {
                    toggleEleve(e.id);
                  } else {
                    setActiveCardId((prev) => (prev === e.id ? null : e.id));
                  }
                }}
                className={cn(
                  "p-3.5 transition-colors cursor-pointer select-none",
                  modeSelection && isSelected && "bg-primary/5",
                  isExpanded && !modeSelection && "bg-gray-50/80"
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {modeSelection && (
                      <div className="pt-0.5" onClick={(ev) => ev.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${e.nom} ${e.prenoms}`}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleEleve(e.id)}
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {e.matricule}
                        </span>
                        <Link
                          href={`/admin/eleves/${e.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="font-semibold text-gray-900 hover:text-primary hover:underline truncate"
                        >
                          {e.nom} {e.prenoms}
                        </Link>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-gray-700">{e.classes?.nom_classe ?? "—"}</span>
                        <span>•</span>
                        <span>{e.classes?.sites?.nom_site ?? "—"}</span>
                      </div>

                      {peutGerer && (e.contact_parent || e.contact_parent_2) && (
                        <div className="mt-1 text-[11px] text-gray-400 truncate">
                          {e.contact_parent && <span>Tel 1: {formaterNumeroAffichage(e.contact_parent)}</span>}
                          {e.contact_parent && e.contact_parent_2 && <span> • </span>}
                          {e.contact_parent_2 && <span>Tel 2: {formaterNumeroAffichage(e.contact_parent_2)}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Indicateur visuel discret du clic pour déplier les actions sur mobile */}
                  {!modeSelection && peutGerer && (
                    <div className="shrink-0 text-gray-400 pt-1">
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded && "rotate-180 text-primary"
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Section Actions : Totalement masquée par défaut sur mobile, affichée UNIQUEMENT au clic */}
                {isExpanded && !modeSelection && peutGerer && (
                  <div
                    className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-end gap-1.5 flex-wrap animate-in fade-in duration-150"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <Link href={`/admin/eleves/${e.id}/modifier`}>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Modifier
                      </Button>
                    </Link>

                    <SuspendreDialog eleveId={e.id} nomComplet={`${e.nom} ${e.prenoms}`} />

                    {estCoordonnateur && (
                      <>
                        <ReinitialiserMotDePasseParentDialog
                          matricule={e.matricule}
                          nomComplet={`${e.nom} ${e.prenoms}`}
                        />
                        <SupprimerElevesDialog
                          eleves={[
                            {
                              id: e.id,
                              nom: e.nom,
                              prenoms: e.prenoms,
                              matricule: e.matricule,
                              classe: e.classes?.nom_classe,
                            },
                          ]}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Barre flottante d'actions de sélection multiple */}
      {modeSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-gray-900/95 backdrop-blur text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 sm:gap-3">
            
            <span className="text-xs sm:text-sm font-medium truncate">
              {selectedIds.size > 1
                ? `${selectedIds.size} élèves sélectionnés`
                : `${selectedIds.size} élève sélectionné`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleTout}
              className="text-xs bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white px-2 sm:px-3 h-8"
            >
              {toutEstCoche ? "Tout décocher" : "Tout cocher"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setDialogGroupOpen(true)}
              className="gap-1 text-xs px-2.5 sm:px-3 h-8 shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={quitterModeSelection}
              className="text-xs text-gray-400 hover:text-white p-1.5 h-8"
              title="Fermer la sélection"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 5. Dialogue de suppression groupée contrôlé */}
      {dialogGroupOpen && (
        <SupprimerElevesDialog
          eleves={elevesSelectionnesObjets}
          open={dialogGroupOpen}
          onOpenChange={setDialogGroupOpen}
          onSuccess={() => {
            setSelectedIds(new Set());
            setModeSelection(false);
          }}
        />
      )}
    </div>
  );
}
