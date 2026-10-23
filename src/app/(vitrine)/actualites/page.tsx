import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Article, Categorie } from "@/lib/actualites";
import { ActualitesContent } from "@/components/vitrine/ActualitesContent";
import { PageHeader } from "@/components/vitrine/PageHeader";

export const metadata: Metadata = {
  title: "Actualités et vie scolaire | Groupe Secret de la Réussite",
  description: "Suivez les dernières actualités, événements et temps forts de la vie scolaire chez GSR.",
  alternates: { canonical: "/actualites" },
  openGraph: {
    title: "Actualités et vie scolaire | Groupe Secret de la Réussite",
    description: "Les dernières actualités et temps forts de la vie scolaire chez GSR.",
    url: "/actualites",
  },
};

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie`;

interface ActualiteRow {
  id: number;
  titre: string;
  categorie: Categorie;
  extrait: string;
  contenu: string;
  date_publication: string;
  a_la_une_jusqu_au: string | null;
  actualites_images: { storage_path: string; ordre: number }[];
}

function versArticle(row: ActualiteRow): Article {
  const images = [...row.actualites_images].sort((a, b) => a.ordre - b.ordre).map((img) => `${STORAGE_URL}/${img.storage_path}`);
  return {
    id: row.id,
    title: row.titre,
    category: row.categorie,
    images: images.length > 0 ? images : ["/images/imgC.jpg"],
    date: new Date(row.date_publication).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    description: row.extrait,
    contenu: row.contenu.split(/\n\s*\n/).filter(Boolean),
  };
}

/** §discussion 2026-08-05 — lecture publique (RLS ouverte aux articles statut='publie'), gestion depuis /admin/actualites. */
export default async function ActualitesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("actualites")
    .select("id, titre, categorie, extrait, contenu, date_publication, a_la_une_jusqu_au, actualites_images(storage_path, ordre)")
    .eq("statut", "publie")
    .order("date_publication", { ascending: false });

  const rows = (data ?? []) as unknown as ActualiteRow[];
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const rowALaUne = rows.find((r) => r.a_la_une_jusqu_au && r.a_la_une_jusqu_au >= aujourdHui);
  const autresRows = rows.filter((r) => r.id !== rowALaUne?.id);

  const aLaUne = rowALaUne ? versArticle(rowALaUne) : null;
  const autresArticles = autresRows.map(versArticle);

  return (
    <div className="bg-gray-50/50 min-h-screen pb-16">
      {/* ── Page Header Harmonisé ── */}
      <PageHeader
        title="Actualités & Événements"
        description="Restez informé de la vie scolaire, des événements marquants et des réussites de notre communauté éducative. Découvrez les dernières nouvelles du GSR."
        breadcrumb={[{ label: "Actualités" }]}
        align="center"
        maxWidth="max-w-4xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <ActualitesContent aLaUne={aLaUne} autresArticles={autresArticles} />
      </div>
    </div>
  );
}
