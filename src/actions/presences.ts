"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import type { UserRole } from "@/lib/constants";

const ROLES_PRESENCES: UserRole[] = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"];

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!ROLES_PRESENCES.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

export interface EnregistrerAppelInput {
  datePresence: string; // YYYY-MM-DD
  siteId: number;
  classeId: number;
  anneeScolaireId: number;
  presences: { eleveId: number; present: boolean }[];
}

/**
 * §discussion 2026-08-16 — bouton "Sauvegarder" de l'appel du jour. L'état
 * coché/décoché de chaque carte reste local jusqu'ici (rien n'est
 * pré-enregistré par défaut) ; un seul upsert multi-lignes envoie l'état
 * exact affiché à l'écran. Pas de service role : la policy `presences_acces`
 * (§4) scope directement sur `presences.site_id` (coordonnateur/comptable
 * global, superviseur/chef_site sur leur(s) site(s)).
 *
 * §discussion 2026-08-16 — un appel sauvegardé est définitif pour la classe
 * et le jour donnés : refuse un second appel si des lignes existent déjà
 * (garde serveur, la page bloque aussi côté UI en amont — double-onglet ou
 * resoumission ne peuvent pas silencieusement écraser l'appel du jour). Seule
 * modification possible ensuite : `marquerRetardataire`, qui passe un élève
 * ponctuel d'absent à présent sans repasser par ici.
 */
export async function enregistrerAppelDuJour(input: EnregistrerAppelInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (input.presences.length === 0) return {};

  const supabase = await createClient();

  const { data: appelExistant } = await supabase
    .from("presences")
    .select("id")
    .eq("classe_id", input.classeId)
    .eq("date_presence", input.datePresence)
    .limit(1);
  if (appelExistant && appelExistant.length > 0) {
    return { error: "L'appel a déjà été enregistré aujourd'hui pour cette classe. Pour un élève arrivé en retard, utilisez Retardataires." };
  }

  const rows = input.presences.map((p) => ({
    eleve_id: p.eleveId,
    date_presence: input.datePresence,
    site_id: input.siteId,
    classe_id: input.classeId,
    annee_scolaire_id: input.anneeScolaireId,
    present: p.present,
  }));

  const { error } = await supabase.from("presences").upsert(rows, { onConflict: "eleve_id,date_presence" });
  if (error) return { error: error.message };

  const absentsDuJour = input.presences.filter((p) => !p.present);
  if (absentsDuJour.length > 0) {
    try {
      const supabaseAdmin = createServiceRoleClient();
      const idsAbsents = absentsDuJour.map((p) => p.eleveId);

      const [anneeStr, moisStr] = input.datePresence.split("-");
      const annee = Number(anneeStr);
      const mois = Number(moisStr);
      const dernierJour = new Date(annee, mois, 0).getDate();
      const debutMois = `${anneeStr}-${moisStr}-01`;
      const finMois = `${anneeStr}-${moisStr}-${String(dernierJour).padStart(2, "0")}`;

      const { data: absencesMois } = await supabaseAdmin
        .from("presences")
        .select("eleve_id")
        .in("eleve_id", idsAbsents)
        .eq("present", false)
        .gte("date_presence", debutMois)
        .lte("date_presence", finMois);

      const compteAbsences = new Map<number, number>();
      for (const a of absencesMois ?? []) {
        compteAbsences.set(a.eleve_id, (compteAbsences.get(a.eleve_id) ?? 0) + 1);
      }

      // Option A : déclenchement uniquement à la 2ème absence du mois
      const elevesSeuilAtteint = idsAbsents.filter((id) => compteAbsences.get(id) === 2);

      if (elevesSeuilAtteint.length > 0) {
        const { data: elevesInfos } = await supabaseAdmin
          .from("eleves")
          .select("id, nom, prenoms, matricule, classes(nom_classe)")
          .in("id", elevesSeuilAtteint);

        const nomMois = new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
        const nomMoisMaj = nomMois.charAt(0).toUpperCase() + nomMois.slice(1);

        const notificationsAInserer = (elevesInfos ?? []).map((e) => {
          const classeNom = (e as unknown as { classes: { nom_classe?: string } })?.classes?.nom_classe;
          const classeLabel = classeNom ? `${classeNom}, ` : "";
          return {
            site_id: input.siteId,
            contenu: `⚠️ Alerte assiduité : ${e.nom} ${e.prenoms} (${classeLabel}${e.matricule}) a cumulé 2 absences au cours du mois de ${nomMoisMaj}.`,
            roles_cibles: ["coordonnateur", "superviseur", "chef_site"],
          };
        });

        if (notificationsAInserer.length > 0) {
          await supabaseAdmin.from("notifications").insert(notificationsAInserer);
        }
      }
    } catch (e) {
      console.error("Erreur lors de la génération de la notification d'assiduité :", e);
    }
  }

  return {};
}

export interface MarquerRetardataireInput {
  eleveId: number;
}

interface EleveAvecSite {
  classe_id: number;
  classes: { site_id: number } | null;
}

/**
 * "Retardataires" — marque présent un élève arrivé après l'appel du jour.
 * Résout classe/site/année en cours côté serveur : l'appelant ne fournit que
 * l'élève (trouvé par recherche de nom), pas de sélection manuelle
 * classe/site/date. RLS (`presences_acces`) refuse silencieusement l'upsert
 * si le site résolu n'est pas dans le périmètre de l'appelant.
 */
export async function marquerRetardataire(input: MarquerRetardataireInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const supabase = await createClient();

  const [{ data: eleveData }, { data: anneeEnCours }] = await Promise.all([
    supabase.from("eleves").select("classe_id, classes(site_id)").eq("id", input.eleveId).single(),
    supabase.from("annees_scolaires").select("id").eq("statut", "en_cours").maybeSingle(),
  ]);

  const eleve = eleveData as unknown as EleveAvecSite | null;
  if (!eleve?.classes) return { error: "Élève introuvable" };
  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const { error } = await supabase.from("presences").upsert(
    {
      eleve_id: input.eleveId,
      date_presence: new Date().toISOString().slice(0, 10),
      site_id: eleve.classes.site_id,
      classe_id: eleve.classe_id,
      annee_scolaire_id: anneeEnCours.id,
      present: true,
    },
    { onConflict: "eleve_id,date_presence" }
  );

  if (error) return { error: error.message };
  return {};
}
