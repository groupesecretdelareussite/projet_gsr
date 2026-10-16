"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
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
      render: (e) => <span className="font-medium">{e.nom}</span>,
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
          <TelechargerQuittanceButton data={e.quittance} />
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
        className="hover:text-primary hover:underline"
      >
        {e.nom} {e.prenoms}
      </Link>
    ),
    topRight: (e) => <TelechargerQuittanceButton data={e.quittance} />,
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
