"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { UserX, Search, Receipt } from "lucide-react";
import { DataTable, type DataTableColumn, type MobileCardConfig } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReinscrireDialog } from "@/components/admin/eleves/ReinscrireDialog";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { RAISON_LABELS } from "@/lib/constants";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";

export interface EleveSuspenduRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
  suspension: {
    raison: string;
    motif: string;
    montant_du: number;
    mois_souscription: string | null;
    date_suspension: string;
  } | null;
  estVenuDansLeMois: boolean | null;
}

interface SuspendusClientProps {
  rowsInitiales: EleveSuspenduRow[];
  peutGerer: boolean;
  peutExporter: boolean;
  dateExport: string;
}

export function SuspendusClient({
  rowsInitiales,
  peutGerer,
  peutExporter,
  dateExport,
}: SuspendusClientProps) {
  const [recherche, setRecherche] = useState("");

  const rowsFiltrees = useMemo(() => {
    if (!recherche.trim()) return rowsInitiales;
    const q = recherche.toLowerCase().trim();
    return rowsInitiales.filter((e) => {
      const nomComplet = `${e.nom} ${e.prenoms}`.toLowerCase();
      const matricule = e.matricule.toLowerCase();
      const nomClasse = (e.classes?.nom_classe ?? "").toLowerCase();
      const nomSite = (e.classes?.sites?.nom_site ?? "").toLowerCase();
      const motif = (e.suspension?.motif ?? "").toLowerCase();
      const raisonLabel = e.suspension?.raison
        ? (RAISON_LABELS[e.suspension.raison as keyof typeof RAISON_LABELS] ?? "").toLowerCase()
        : "";

      return (
        nomComplet.includes(q) ||
        matricule.includes(q) ||
        nomClasse.includes(q) ||
        nomSite.includes(q) ||
        motif.includes(q) ||
        raisonLabel.includes(q)
      );
    });
  }, [rowsInitiales, recherche]);

  const columns: DataTableColumn<EleveSuspenduRow>[] = [
    { key: "matricule", label: "Matricule", render: (e) => <span className="font-mono text-xs">{e.matricule}</span> },
    { key: "nom", label: "Nom", render: (e) => `${e.nom} ${e.prenoms}` },
    { key: "classe", label: "Classe / Site", render: (e) => `${e.classes?.nom_classe ?? "—"} — ${e.classes?.sites?.nom_site ?? "—"}` },
    {
      key: "raison",
      label: "Raison",
      render: (e) => {
        const raison = e.suspension?.raison as keyof typeof RAISON_LABELS | undefined;
        return raison ? <Badge variant="warning">{RAISON_LABELS[raison]}</Badge> : "—";
      },
    },
    {
      key: "motif",
      label: "Motif",
      render: (e) => {
        const motif = e.suspension?.motif;
        return motif ? (
          <span className="block md:max-w-[220px] md:truncate" title={motif}>
            {motif}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "montant_du",
      label: "Montant dû",
      render: (e) => {
        const montant = e.suspension?.montant_du ?? 0;
        if (montant === 0) return "0 F";
        if (e.estVenuDansLeMois === false) return <span className="text-gray-400 italic">Sera exonéré (absence)</span>;
        return <span className="text-red-600 font-semibold">{montant.toLocaleString("fr-FR")} F</span>;
      },
    },
    ...(peutGerer
      ? [
          {
            key: "actions",
            label: "Actions",
            render: (e: EleveSuspenduRow) => {
              const suspension = e.suspension;
              return (
                <div className={ACTIONS_HOVER_REVEAL}>
                  <ReinscrireDialog
                    eleveId={e.id}
                    nomComplet={`${e.nom} ${e.prenoms}`}
                    raison={suspension?.raison ?? ""}
                    montantDu={suspension?.montant_du ?? 0}
                    moisSouscription={suspension?.mois_souscription ?? null}
                    estVenuDansLeMois={e.estVenuDansLeMois}
                  />
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const lignesExport = rowsFiltrees.map((e) => {
    const suspension = e.suspension;
    const raison = suspension?.raison as keyof typeof RAISON_LABELS | undefined;
    return {
      Matricule: e.matricule,
      Nom: e.nom,
      Prénoms: e.prenoms,
      "Classe / Site": `${e.classes?.nom_classe ?? "—"} — ${e.classes?.sites?.nom_site ?? "—"}`,
      Raison: raison ? RAISON_LABELS[raison] : "—",
      Motif: suspension?.motif ?? "—",
      "Montant dû": suspension?.montant_du ?? 0,
    };
  });

  const mobileCard: MobileCardConfig<EleveSuspenduRow> = {
    badge: (e) => (
      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
        {e.matricule}
      </span>
    ),
    title: (e) => (
      <Link href={`/admin/eleves/${e.id}`} className="hover:text-primary hover:underline">
        {e.nom} {e.prenoms}
      </Link>
    ),
    topRight: (e) => {
      const suspension = e.suspension;
      const raison = suspension?.raison as keyof typeof RAISON_LABELS | undefined;
      const montant = suspension?.montant_du ?? 0;
      return (
        <div className="flex flex-col items-end gap-1">
          {raison && <Badge variant="warning">{RAISON_LABELS[raison]}</Badge>}
          {montant > 0 && e.estVenuDansLeMois !== false && (
            <span className="text-red-600 font-semibold text-xs">{montant.toLocaleString("fr-FR")} F</span>
          )}
        </div>
      );
    },
    subtitle: (e) => (
      <>
        <span className="font-medium text-gray-700">{e.classes?.nom_classe ?? "—"}</span>
        <span>•</span>
        <span>{e.classes?.sites?.nom_site ?? "—"}</span>
      </>
    ),
    extraInfo: (e) => {
      const suspension = e.suspension;
      if (!suspension?.motif) return null;
      return <span>Motif : {suspension.motif}</span>;
    },
    actions: peutGerer
      ? (e) => {
          const suspension = e.suspension;
          return (
            <ReinscrireDialog
              eleveId={e.id}
              nomComplet={`${e.nom} ${e.prenoms}`}
              raison={suspension?.raison ?? ""}
              montantDu={suspension?.montant_du ?? 0}
              moisSouscription={suspension?.mois_souscription ?? null}
              estVenuDansLeMois={e.estVenuDansLeMois}
            />
          );
        }
      : undefined,
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, matricule, classe, site..."
            className="pl-9 text-xs sm:text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {peutGerer && (
            <Link
              href="/admin/eleves/suspendus/regularisation"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-white bg-primary-gradient shadow-xs hover:shadow-md transition-all"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Régularisation</span>
            </Link>
          )}
          {peutExporter && (
            <ExporterExcelButton
              titre={`Élèves suspendus — ${dateExport}`}
              lignes={lignesExport}
              nomFichier={`Eleves_suspendus_${dateExport}`.replace(/\s+/g, "_")}
              nomFeuille="Suspendus"
            />
          )}
        </div>
      </div>

      {/* Tableau des données filtrées */}
      {rowsFiltrees.length === 0 ? (
        <EmptyState
          icon={UserX}
          title={recherche.trim() ? "Aucun élève trouvé" : "Aucun élève suspendu"}
          description={
            recherche.trim()
              ? "Aucun résultat ne correspond à votre recherche."
              : "Tous les élèves inscrits sont actuellement actifs."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rowsFiltrees}
          rowKey={(e) => e.id}
          mobileCard={mobileCard}
        />
      )}
    </div>
  );
}
