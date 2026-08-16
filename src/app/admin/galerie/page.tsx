import { Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { UploaderPhotoForm } from "@/components/admin/galerie/UploaderPhotoForm";
import { GalerieAdminGrid, type PhotoGalerieAdmin } from "@/components/admin/galerie/GalerieAdminGrid";

const BUCKET = "galerie-admin";
const DUREE_SIGNATURE_SECONDES = 3600;

interface PhotoRow {
  id: number;
  storage_path: string;
  nom_fichier: string;
  date_ajout: string;
  ajoute_par: string;
  users: { username: string } | null;
}

/**
 * §5.4 GSR_ARCHITECTURE.md — archive interne, distincte de la galerie
 * vitrine publique. Ouverte à chef_site/secretaire depuis le 2026-08-16
 * (§discussion) : accès complet en lecture/ajout, suppression bornée à leurs
 * propres photos (voir GalerieAdminGrid + supprimerPhotoGalerieAdmin).
 */
export default async function GalerieAdminPage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Galerie" />
        <EmptyState icon={Images} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const { data } = await supabase
    .from("galerie_admin")
    .select("id, storage_path, nom_fichier, date_ajout, ajoute_par, users(username)")
    .order("date_ajout", { ascending: false });
  const lignes = (data ?? []) as unknown as PhotoRow[];

  const chemins = lignes.map((l) => l.storage_path);
  const { data: urlsSignees } =
    chemins.length > 0 ? await supabase.storage.from(BUCKET).createSignedUrls(chemins, DUREE_SIGNATURE_SECONDES) : { data: [] };
  const urlParChemin = new Map((urlsSignees ?? []).map((u) => [u.path, u.signedUrl]));

  const photos: PhotoGalerieAdmin[] = lignes.map((l) => ({
    id: l.id,
    storage_path: l.storage_path,
    nom_fichier: l.nom_fichier,
    date_ajout: l.date_ajout,
    ajoutePar: l.users?.username ?? "?",
    ajouteParId: l.ajoute_par,
    url: urlParChemin.get(l.storage_path) ?? null,
  }));

  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";

  return (
    <div>
      <PageHeader title="Galerie" subtitle="Archive interne de fichiers précieux — non visible sur le site public" />

      <div className="mb-6">
        <UploaderPhotoForm />
      </div>

      {photos.length === 0 ? (
        <EmptyState icon={Images} title="Aucune photo" description="Ajoutez votre première photo ci-dessus." />
      ) : (
        <GalerieAdminGrid photos={photos} suppressionLimiteeAuProprietaire={estChefSiteOuSecretaire} utilisateurId={scope.userId} />
      )}
    </div>
  );
}
