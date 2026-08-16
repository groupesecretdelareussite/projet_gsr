"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

// §discussion 2026-08-16 — ouvert à chef_site/secretaire (sql/021) : accès en
// lecture/ajout complet, suppression bornée à ses propres uploads (voir
// supprimerPhotoGalerieAdmin ci-dessous).
const ROLES_GALERIE_ADMIN = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"] as const;
const BUCKET = "galerie-admin";
const TYPES_AUTORISES = ["image/png", "image/jpeg", "image/webp"];
const TAILLE_MAX = 10 * 1024 * 1024;

async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(await createClient());
  if (!ROLES_GALERIE_ADMIN.includes(scope.role as (typeof ROLES_GALERIE_ADMIN)[number])) {
    throw new Error("Non autorisé");
  }
  return scope;
}

/** Archive interne de fichiers précieux — distincte de la galerie vitrine publique. RLS sur le bucket "galerie-admin" fait déjà l'essentiel du travail (sql/008). */
export async function uploaderPhotoGalerieAdmin(formData: FormData): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabase = await createClient();

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { error: "Aucun fichier sélectionné" };
  }
  if (!TYPES_AUTORISES.includes(fichier.type)) {
    return { error: "Format non supporté (PNG, JPEG ou WEBP uniquement)" };
  }
  if (fichier.size > TAILLE_MAX) {
    return { error: "Fichier trop volumineux (10 Mo maximum)" };
  }

  const extension = fichier.name.split(".").pop() ?? "jpg";
  const chemin = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(chemin, fichier);
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("galerie_admin").insert({
    storage_path: chemin,
    nom_fichier: fichier.name,
    taille_octets: fichier.size,
    ajoute_par: scope.userId,
  });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([chemin]);
    return { error: insertError.message };
  }

  revalidatePath("/admin/galerie");
  return {};
}

/**
 * §discussion 2026-08-16 — chef_site/secretaire ne peuvent supprimer que
 * leurs propres photos (RLS sql/021 l'impose déjà au niveau base ; ce
 * contrôle applicatif donne un message clair plutôt qu'un échec RLS opaque).
 */
export async function supprimerPhotoGalerieAdmin(id: number, storagePath: string): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabase = await createClient();

  if (scope.role === "chef_site" || scope.role === "secretaire") {
    const { data: photo } = await supabase.from("galerie_admin").select("ajoute_par").eq("id", id).maybeSingle();
    if (!photo || photo.ajoute_par !== scope.userId) {
      return { error: "Vous ne pouvez supprimer que vos propres photos" };
    }
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) return { error: storageError.message };

  const { error } = await supabase.from("galerie_admin").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/galerie");
  return {};
}
