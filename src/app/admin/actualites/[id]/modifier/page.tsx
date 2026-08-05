import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ActualiteForm } from "@/components/admin/actualites/ActualiteForm";
import type { Categorie } from "@/actions/actualites";

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie`;

export default async function ModifierActualitePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Modifier l'article" />
        <EmptyState icon={Newspaper} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data: article } = await supabaseAdmin
    .from("actualites")
    .select("id, titre, categorie, extrait, contenu, statut, a_la_une_jusqu_au")
    .eq("id", params.id)
    .maybeSingle();
  if (!article) notFound();

  const { data: images } = await supabaseAdmin
    .from("actualites_images")
    .select("id, storage_path, ordre")
    .eq("actualite_id", article.id)
    .order("ordre", { ascending: true });

  return (
    <div>
      <PageHeader title="Modifier l'article" subtitle={article.titre} />
      <ActualiteForm
        article={{
          id: article.id,
          titre: article.titre,
          categorie: article.categorie as Categorie,
          extrait: article.extrait,
          contenu: article.contenu,
          statut: article.statut as "brouillon" | "publie",
          aLaUneJusquAu: article.a_la_une_jusqu_au,
          images: (images ?? []).map((img) => ({ id: img.id, url: `${STORAGE_URL}/${img.storage_path}` })),
        }}
      />
    </div>
  );
}
