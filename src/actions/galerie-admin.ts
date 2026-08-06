"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

const ROLES_GALERIE_ADMIN = ["coordonnateur", "comptable", "superviseur"] as const;
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

export async function supprimerPhotoGalerieAdmin(id: number, storagePath: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabase = await createClient();

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) return { error: storageError.message };

  const { error } = await supabase.from("galerie_admin").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/galerie");
  return {};
}
