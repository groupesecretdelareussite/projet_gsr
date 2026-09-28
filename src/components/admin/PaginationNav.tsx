"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationNavProps {
  pageActuelle: number;
  totalPages: number;
  totalItems: number;
  taillePage: number;
  itemLabel?: string;
}

export function PaginationNav({
  pageActuelle,
  totalPages,
  totalItems,
  taillePage,
  itemLabel = "éléments",
}: PaginationNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const debut = (pageActuelle - 1) * taillePage + 1;
  const fin = Math.min(pageActuelle * taillePage, totalItems);

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  // Calcul des numéros de page à afficher
  const pages: (number | "ellipsis")[] = [];
  const delta = 1; // Nombre de pages autour de la page active

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= pageActuelle - delta && i <= pageActuelle + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 py-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-600">
      <div className="text-xs sm:text-sm text-gray-500">
        Affichage de <span className="font-semibold text-gray-800">{debut}</span> à{" "}
        <span className="font-semibold text-gray-800">{fin}</span> sur{" "}
        <span className="font-semibold text-gray-800">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5">
        {pageActuelle > 1 ? (
          <Link href={buildHref(pageActuelle - 1)}>
            <Button variant="outline" size="sm" className="h-8 px-2.5">
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="h-8 px-2.5 opacity-50 cursor-not-allowed" disabled>
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>
        )}

        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 select-none">
                  …
                </span>
              );
            }

            const estActif = p === pageActuelle;
            return (
              <Link key={p} href={buildHref(p)}>
                <Button
                  variant={estActif ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 text-xs font-medium ${
                    estActif ? "bg-primary text-white pointer-events-none" : "hover:bg-gray-50"
                  }`}
                >
                  {p}
                </Button>
              </Link>
            );
          })}
        </div>

        {pageActuelle < totalPages ? (
          <Link href={buildHref(pageActuelle + 1)}>
            <Button variant="outline" size="sm" className="h-8 px-2.5">
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="h-8 px-2.5 opacity-50 cursor-not-allowed" disabled>
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
