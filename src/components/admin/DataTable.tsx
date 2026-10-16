import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyState?: ReactNode;
  /** Omet la carte (fond blanc, bordure) — pour un usage imbriqué dans une carte existante (ex. Bloc de la fiche élève). */
  bare?: boolean;
  /** Configuration personnalisée pour le rendu mobile en cartes interactives épurées avec actions révélées au clic. */
  mobileCard?: MobileCardConfig<T>;
}

/**
 * §3.3 GSR_ARCHITECTURE.md — thead dégradé vert clair, responsive -> cartes
 * sur mobile.
 */
export function DataTable<T>({ columns, rows, rowKey, emptyState, bare = false, mobileCard }: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return bare ? <>{emptyState}</> : <div className="bg-white rounded-2xl border border-gray-100">{emptyState}</div>;
  }

  return (
    <div className={bare ? "overflow-hidden" : "bg-white rounded-2xl border border-gray-100 overflow-hidden"}>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-primary/15 to-primary/5">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-gray-50 group">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : Cartes interactives si mobileCard est fourni, sinon fallback clé-valeur classique */}
      {mobileCard ? (
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

            if (!hasActions) {
              return (
                <div key={key} className="p-3.5 transition-colors duration-150 hover:bg-gray-50/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cardBadge}
                        <div className="font-semibold text-gray-900 text-sm">
                          {cardTitle}
                        </div>
                      </div>
                      {cardSubtitle && (
                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                          {cardSubtitle}
                        </div>
                      )}
                      {cardExtra && (
                        <div className="mt-1 text-xs text-gray-400">
                          {cardExtra}
                        </div>
                      )}
                    </div>
                    {cardTopRight && (
                      <div className="flex items-center gap-2 shrink-0">
                        {cardTopRight}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <details
                key={key}
                name="table-mobile-card"
                className="group p-3.5 transition-colors duration-150 open:bg-gray-50/80 hover:bg-gray-50/40"
              >
                <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden select-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cardBadge}
                        <div className="font-semibold text-gray-900 text-sm">
                          {cardTitle}
                        </div>
                      </div>
                      {cardSubtitle && (
                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                          {cardSubtitle}
                        </div>
                      )}
                      {cardExtra && (
                        <div className="mt-1 text-xs text-gray-400">
                          {cardExtra}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cardTopRight}
                      <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                    </div>
                  </div>
                </summary>

                <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-end gap-1.5 flex-wrap animate-in fade-in duration-150">
                  {actionsContent}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="md:hidden divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={rowKey(row)} className="p-4 space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{col.label}</span>
                  <span className="text-gray-700 text-right">{col.render(row)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
