"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";

async function getProfesseurIdAndAssert(): Promise<number> {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    throw new Error("Non authentifié");
  }
  return session.professeurId;
}

function estErreurContrainteUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/** §10.7 GSR_ARCHITECTURE.md — postulation d'un professeur sur un créneau publié. */
export async function soumettrePostulationTD(creneauId: number): Promise<{ error?: string }> {
  const professeurId = await getProfesseurIdAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: creneau } = await supabaseAdmin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauId).single();
  if (!creneau || creneau.statut_creneau !== "public") {
    return { error: "Ce créneau n'est plus ouvert aux candidatures." };
  }

  const { error } = await supabaseAdmin.schema("td").from("postulations").insert({ creneau_id: creneauId, professeur_id: professeurId });
  if (error) {
    if (estErreurContrainteUnique(error)) {
      return { error: "Vous avez déjà postulé sur ce créneau." };
    }
    return { error: error.message };
  }

  revalidatePath("/td/prof/candidatures");
  return {};
}

/** Retrait d'une candidature encore en attente — le professeur change d'avis avant l'arbitrage. */
export async function retirerPostulationTD(postulationId: number): Promise<{ error?: string }> {
  const professeurId = await getProfesseurIdAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: postulation } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .select("professeur_id, statut_validation")
    .eq("id", postulationId)
    .single();

  if (!postulation || postulation.professeur_id !== professeurId) {
    return { error: "Candidature introuvable" };
  }
  if (postulation.statut_validation !== "En attente") {
    return { error: "Cette candidature a déjà été traitée." };
  }

  const { error } = await supabaseAdmin.schema("td").from("postulations").delete().eq("id", postulationId);
  if (error) return { error: error.message };

  revalidatePath("/td/prof/candidatures");
  return {};
}
