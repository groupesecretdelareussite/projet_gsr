"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

const BUCKET = "galerie";
const TYPES_AUTORISES = ["image/png", "image/jpeg", "image/webp"];
const TAILLE_MAX = 10 * 1024 * 1024;
const DUREE_A_LA_UNE_JOURS = 14;

export const CATEGORIES = ["Vie scolaire", "Événement", "Réussite", "Cours", "Examens/Contrôle"] as const;
export type Categorie = (typeof CATEGORIES)[number];

async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateActualites() {
  revalidatePath("/admin/actualites");
  revalidatePath("/actualites");
}

/** "À la une" n'est jamais un booléen séparé — juste cette date, calculée ici si cochée sans date précisée (§ discussion 2026-08-05, durée par défaut 14 jours). */
function calculerALaUneJusquAu(coche: boolean, dateISO: string | null): string | null {
  if (!coche) return null;
  if (dateISO) return dateISO;
  const dansNJours = new Date();
  dansNJours.setDate(dansNJours.getDate() + DUREE_A_LA_UNE_JOURS);
  return dansNJours.toISOString().slice(0, 10);
}

function validerImages(images: File[]): string | null {
  for (const image of images) {
    if (!TYPES_AUTORISES.includes(image.type)) {
      return "Format d'image non supporté (PNG, JPEG ou WEBP uniquement)";
    }
    if (image.size > TAILLE_MAX) {
      return "Une image dépasse 10 Mo";
    }
  }
  return null;
}

/** Uploade chaque image et enregistre sa ligne, à la suite de `ordreDepart` — n'écrit rien tant qu'une image n'a pas réussi les deux étapes. */
async function uploaderImages(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  actualiteId: number,
  images: File[],
  ordreDepart: number
): Promise<string | null> {
  let ordre = ordreDepart;
  for (const image of images) {
    const extension = image.name.split(".").pop() ?? "jpg";
    const chemin = `vitrine/actualites/${actualiteId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(chemin, image);
    if (uploadError) return uploadError.message;

    const { error: imgError } = await supabaseAdmin
      .from("actualites_images")
      .insert({ actualite_id: actualiteId, storage_path: chemin, ordre });
    if (imgError) return imgError.message;
    ordre++;
  }
  return null;
}

function extraireChampsFormulaire(formData: FormData) {
  return {
    titre: String(formData.get("titre") ?? "").trim(),
    categorie: String(formData.get("categorie") ?? "") as Categorie,
    extrait: String(formData.get("extrait") ?? "").trim(),
    contenu: String(formData.get("contenu") ?? "").trim(),
    statut: (formData.get("statut") === "publie" ? "publie" : "brouillon") as "brouillon" | "publie",
    aLaUne: formData.get("aLaUne") === "on",
    aLaUneJusquAu: (formData.get("aLaUneJusquAu") as string) || null,
  };
}

/** §discussion 2026-08-05 — première image (ordre le plus bas) = couverture sur /actualites ; toutes défilent dans la modal de lecture. */
export async function creerActualite(formData: FormData): Promise<{ error?: string; id?: number }> {
  const scope = await getScopeAndAssert();
  const champs = extraireChampsFormulaire(formData);

  if (!champs.titre || !champs.categorie || !champs.extrait || !champs.contenu) {
    return { error: "Tous les champs sont requis" };
  }

  const images = formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  if (images.length === 0) {
    return { error: "Au moins une image est requise" };
  }
  const erreurImage = validerImages(images);
  if (erreurImage) return { error: erreurImage };

  const supabaseAdmin = createServiceRoleClient();

  const { data: article, error } = await supabaseAdmin
    .from("actualites")
    .insert({
      titre: champs.titre,
      categorie: champs.categorie,
      extrait: champs.extrait,
      contenu: champs.contenu,
      statut: champs.statut,
      a_la_une_jusqu_au: calculerALaUneJusquAu(champs.aLaUne, champs.aLaUneJusquAu),
      cree_par: scope.userId,
    })
    .select("id")
    .single();
  if (error || !article) return { error: error?.message ?? "Échec de création de l'article" };

  const erreurUpload = await uploaderImages(supabaseAdmin, article.id, images, 0);
  if (erreurUpload) {
    await supabaseAdmin.from("actualites").delete().eq("id", article.id);
    return { error: erreurUpload };
  }

  revalidateActualites();
  return { id: article.id };
}

/** Les nouvelles images (champ "images", optionnel) s'ajoutent à la suite des existantes — jamais en couverture, qui reste toujours la plus ancienne (ordre 0). */
export async function modifierActualite(id: number, formData: FormData): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const champs = extraireChampsFormulaire(formData);

  if (!champs.titre || !champs.categorie || !champs.extrait || !champs.contenu) {
    return { error: "Tous les champs sont requis" };
  }

  const nouvellesImages = formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  const erreurImage = validerImages(nouvellesImages);
  if (erreurImage) return { error: erreurImage };

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin
    .from("actualites")
    .update({
      titre: champs.titre,
      categorie: champs.categorie,
      extrait: champs.extrait,
      contenu: champs.contenu,
      statut: champs.statut,
      a_la_une_jusqu_au: calculerALaUneJusquAu(champs.aLaUne, champs.aLaUneJusquAu),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (nouvellesImages.length > 0) {
    const { count } = await supabaseAdmin
      .from("actualites_images")
      .select("id", { count: "exact", head: true })
      .eq("actualite_id", id);
    const erreurUpload = await uploaderImages(supabaseAdmin, id, nouvellesImages, count ?? 0);
    if (erreurUpload) return { error: erreurUpload };
  }

  revalidateActualites();
  return {};
}

export async function supprimerImageActualite(imageId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: image } = await supabaseAdmin
    .from("actualites_images")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { error: "Image introuvable" };

  await supabaseAdmin.storage.from(BUCKET).remove([image.storage_path]);

  const { error } = await supabaseAdmin.from("actualites_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  revalidateActualites();
  return {};
}

export async function supprimerActualite(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: images } = await supabaseAdmin.from("actualites_images").select("storage_path").eq("actualite_id", id);
  if (images && images.length > 0) {
    await supabaseAdmin.storage.from(BUCKET).remove(images.map((img) => img.storage_path));
  }

  const { error } = await supabaseAdmin.from("actualites").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateActualites();
  return {};
}
