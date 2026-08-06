import Image from "next/image";
import Link from "next/link";
import { Newspaper, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionsBar } from "@/components/admin/ActionsBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupprimerActualiteButton } from "@/components/admin/actualites/SupprimerActualiteButton";
import { ACTIONS_HOVER_REVEAL, HOVER_ONLY_LABEL, cn } from "@/lib/utils";
import type { Categorie } from "@/actions/actualites";

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie`;

interface ActualiteRow {
  id: number;
  titre: string;
  categorie: Categorie;
  statut: "brouillon" | "publie";
  a_la_une_jusqu_au: string | null;
  date_publication: string;
  actualites_images: { storage_path: string; ordre: number }[];
}

function estALaUne(dateISO: string | null): boolean {
  if (!dateISO) return false;
  return dateISO >= new Date().toISOString().slice(0, 10);
}

/** §discussion 2026-08-05 — gestion des actualités vitrine, coordonnateur uniquement. */
export default async function ActualitesAdminPage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Actualités" />
        <EmptyState icon={Newspaper} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin
    .from("actualites")
    .select("id, titre, categorie, statut, a_la_une_jusqu_au, date_publication, actualites_images(storage_path, ordre)")
    .order("date_publication", { ascending: false });
  const articles = (data ?? []) as unknown as ActualiteRow[];

  const columns: DataTableColumn<ActualiteRow>[] = [
    {
      key: "couverture",
      label: "",
      render: (a) => {
        const couverture = [...a.actualites_images].sort((x, y) => x.ordre - y.ordre)[0];
        return (
          <div className="relative w-14 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
            {couverture && <Image src={`${STORAGE_URL}/${couverture.storage_path}`} alt="" fill className="object-cover" />}
          </div>
        );
      },
    },
    { key: "titre", label: "Titre", render: (a) => <span className="font-medium text-gray-900">{a.titre}</span> },
    { key: "categorie", label: "Catégorie", render: (a) => a.categorie },
    {
      key: "statut",
      label: "Statut",
      render: (a) => <Badge variant={a.statut === "publie" ? "success" : "neutral"}>{a.statut === "publie" ? "Publié" : "Brouillon"}</Badge>,
    },
    {
      key: "a_la_une",
      label: "À la une",
      render: (a) =>
        estALaUne(a.a_la_une_jusqu_au) ? (
          <Badge variant="warning">Jusqu'au {new Date(a.a_la_une_jusqu_au!).toLocaleDateString("fr-FR")}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "date",
      label: "Date",
      render: (a) => new Date(a.date_publication).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    },
    {
      key: "actions",
      label: "Actions",
      render: (a) => (
        <div className={cn("flex items-center gap-2", ACTIONS_HOVER_REVEAL)}>
          <Link href={`/admin/actualites/${a.id}/modifier`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-3.5 h-3.5" />
              <span className={HOVER_ONLY_LABEL}>Modifier</span>
            </Button>
          </Link>
          <SupprimerActualiteButton id={a.id} titre={a.titre} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Actualités" subtitle="Gérez les articles publiés sur la page Actualités du site public" />

      <ActionsBar>
        <Link href="/admin/actualites/nouveau">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Nouvel article
          </Button>
        </Link>
      </ActionsBar>

      <DataTable
        columns={columns}
        rows={articles}
        rowKey={(a) => a.id}
        emptyState={<EmptyState icon={Newspaper} title="Aucun article" description="Créez votre premier article ci-dessus." />}
      />
    </div>
  );
}
