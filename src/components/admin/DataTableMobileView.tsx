"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileCardConfig<T> {
  /** Titre ou nom principal (ex: Nom Prénoms avec lien, ou libellé de l'élément) */
  title: (row: T) => ReactNode;
  /** Badge optionnel affiché à côté du titre (ex: Matricule en font-mono, Médaille de rang...) */
  badge?: (row: T) => ReactNode;
  /** Élément d'angle supérieur droit (ex: Reste dû, Badge statut, Montant, Quittance...) */
  topRight?: (row: T) => ReactNode;
  /** Métadonnées secondaires compactes (ex: Classe • Site • Date) */
  subtitle?: (row: T) => ReactNode;
  /** Détails complémentaires en police discrète (ex: Contact parent, motif, auteur...) */
  extraInfo?: (row: T) => ReactNode;
  /** Actions masquées au repos et révélées au clic sur la carte */
  actions?: (row: T) => ReactNode;
}

interface DataTableMobileViewProps<T> {
  rows: T[];
  rowKey: (row: T) => string | number;
  mobileCard: MobileCardConfig<T>;
}

export function DataTableMobileView<T>({ rows, rowKey, mobileCard }: DataTableMobileViewProps<T>) {
  const [activeKey, setActiveKey] = useState<string | number | null>(null);

  return (
    <div className="md:hidden divide-y divide-gray-100">
      {rows.map((row) => {
        const key = rowKey(row);
        const cardTitle = mobileCard.title(row);
        const cardBadge = mobileCard.badge?.(row);
        const cardTopRight = mobileCard.topRight?.(row);
        const cardSubtitle = mobileCard.subtitle?.(row);
        const cardExtra = mobileCard.extraInfo?.(row);
        const actionsContent = mobileCard.actions?.(row);

        const hasActions = Boolean(actionsContent);
        const isExpanded = activeKey === key;

        return (
          <div
            key={key}
            onClick={() => {
              if (hasActions) {
                setActiveKey((prev) => (prev === key ? null : key));
              }
            }}
            className={cn(
              "p-3.5 transition-colors select-none",
              hasActions && "cursor-pointer",
              isExpanded && "bg-gray-50/80"
            )}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                {/* Ligne 1 : Badge éventuel + Titre principal */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {cardBadge && <div className="shrink-0">{cardBadge}</div>}
                  <div className="min-w-0 flex-1 font-semibold text-gray-900 truncate">
                    {cardTitle}
                  </div>
                </div>

                {/* Ligne 2 : Métadonnées / Sous-titre */}
                {cardSubtitle && (
                  <div className="mt-1 text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                    {cardSubtitle}
                  </div>
                )}

                {/* Ligne 3 : Informations complémentaires */}
                {cardExtra && (
                  <div className="mt-1 text-[11px] text-gray-400 truncate">
                    {cardExtra}
                  </div>
                )}
              </div>

              {/* Angle supérieur droit : topRight + chevron */}
              <div className="shrink-0 flex items-center gap-2 pt-0.5">
                {cardTopRight && <div>{cardTopRight}</div>}
                {hasActions && (
                  <div className="text-gray-400 pt-0.5">
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isExpanded && "rotate-180 text-primary"
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions révélées au clic */}
            {isExpanded && hasActions && (
              <div
                className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-end gap-1.5 flex-wrap animate-in fade-in duration-150"
                onClick={(ev) => ev.stopPropagation()}
              >
                {actionsContent}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
