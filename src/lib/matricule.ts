import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * §8.3/§12.1 GSR_ARCHITECTURE.md — format [INITIALE][MM][AA][XXXX], 9
 * caractères. v2.1 : un seul contrôle de collision sur `eleves.matricule` —
 * cette table contient désormais actifs ET suspendus (colonne `statut`), il
 * n'existe plus de table séparée à interroger.
 */
export async function genererMatricule(supabase: SupabaseClient, initiale: string): Promise<string> {
  let matricule: string;
  let collision: number;

  do {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const aa = String(new Date().getFullYear()).slice(-2);
    const xxxx = Math.floor(Math.random() * (9876 - 1234 + 1)) + 1234;
    matricule = `${initiale.toUpperCase()}${mm}${aa}${xxxx}`;

    const { count } = await supabase
      .from("eleves")
      .select("*", { count: "exact", head: true })
      .eq("matricule", matricule);

    collision = count ?? 0;
  } while (collision > 0);

  return matricule;
}
