"use client";

import Link from "next/link";
import { CheckCircle2, Award } from "lucide-react";
import { DataTable, type DataTableColumn, type MobileCardConfig } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { TelechargerQuittanceButton } from "@/components/admin/paiements/QuittanceDownloadButton";
import type { QuittanceData } from "@/components/admin/paiements/QuittancePDF";

export interface EleveAJourItem {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  nomClasse: string;
  nomSite: string;
  quittance: QuittanceData;
  estExonere?: boolean;
  motifExoneration?: string;
}

export function AJourTable({
  rows,
  mois,
}: {
  rows: EleveAJourItem[];
  mois: string;
}) {
  const columns: DataTableColumn<EleveAJourItem>[] = [
    {
      key: "matricule",
      label: "Matricule",
      render: (e) => <span className="font-mono text-xs">{e.matricule}</span>,
    },
    {
      key: "nom",
      label: "Nom",
      render: (e) => (
        <span className="font-medium inline-flex items-center gap-1.5">
          <span>{e.nom}</span>
          {e.estExonere && (
            <Award
              className="w-4 h-4 text-purple-600 shrink-0"
              title={e.motifExoneration || "Élève boursier / exonéré"}
            />
          )}
        </span>
      ),
    },
    {
      key: "prenoms",
      label: "Prénoms",
      render: (e) => e.prenoms,
    },
    {
      key: "classe",
      label: "Classe",
      render: (e) => e.nomClasse,
    },
    {
      key: "site",
      label: "Site",
      render: (e) => e.nomSite,
    },
    {
      key: "action",
      label: "Quittance",
      render: (e) => (
        <div className="flex justify-end sm:justify-start">
          {e.estExonere && e.quittance.versements.length === 0 ? (
            <span className="text-xs text-purple-700 font-medium italic">Dispensé</span>
          ) : (
            <TelechargerQuittanceButton data={e.quittance} />
          )}
        </div>
      ),
    },
  ];

  const mobileCard: MobileCardConfig<EleveAJourItem> = {
    badge: (e) => (
      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
        {e.matricule}
      </span>
    ),
    title: (e) => (
      <Link
        href={`/admin/eleves/${e.id}`}
        className="hover:text-primary hover:underline inline-flex items-center gap-1.5"
      >
        <span>
          {e.nom} {e.prenoms}
        </span>
        {e.estExonere && (
          <Award
            className="w-4 h-4 text-purple-600 shrink-0"
            title={e.motifExoneration || "Élève boursier / exonéré"}
          />
        )}
      </Link>
    ),
    topRight: (e) =>
      e.estExonere && e.quittance.versements.length === 0 ? (
        <span className="text-xs text-purple-700 font-medium italic">Dispensé</span>
      ) : (
        <TelechargerQuittanceButton data={e.quittance} />
      ),
    subtitle: (e) => (
      <>
        <span className="font-medium text-gray-700">{e.nomClasse}</span>
        <span>•</span>
        <span>{e.nomSite}</span>
      </>
    ),
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(e) => e.id}
      mobileCard={mobileCard}
      emptyState={
        <EmptyState
          icon={CheckCircle2}
          title="Aucun élève à jour"
          description={`Aucun élève n'a soldé le mois de ${mois}.`}
        />
      }
    />
  );
}
