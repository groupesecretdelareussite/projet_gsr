import { createServiceRoleClient } from "./supabase/admin";
import { moisAVerifierSuspensionAuto } from "./paiements";
import type { MoisScolaire } from "./constants";

export interface EleveSuspenduAuto {
  matricule: string;
  nom: string;
  prenoms: string;
  montantDu: number;
}

export interface ResultatSuspensionAuto {
  moisVerifie: MoisScolaire | null;
  anneeScolaireId: number | null;
  suspendus: EleveSuspenduAuto[];
}

interface EleveActifRef {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classe_id: number;
  classes: { site_id: number } | null;
}

/**
 * §12.3 GSR_ARCHITECTURE.md — suspension automatique pour défaut de
 * paiement. Appelée par le cron (route `/api/cron/suspension-auto`) le 1er
 * de chaque mois avec `new Date()`, et par `scripts/test-suspension-auto.ts`
 * avec une date simulée pour vérification manuelle hors période scolaire
 * réelle. Utilise le service role directement (pas de `getUserScope` : cette
 * fonction n'est jamais appelée dans le contexte d'une session admin — c'est
 * l'appelant, la route cron, qui doit vérifier le secret avant d'invoquer).
 */
export async function executerSuspensionAutomatique(dateReference: Date): Promise<ResultatSuspensionAuto> {
  const moisVerifie = moisAVerifierSuspensionAuto(dateReference);
  if (!moisVerifie) {
    return { moisVerifie: null, anneeScolaireId: null, suspendus: [] };
  }

  const supabase = createServiceRoleClient();

  const { data: anneeEnCours } = await supabase
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .maybeSingle();
  if (!anneeEnCours) return { moisVerifie, anneeScolaireId: null, suspendus: [] };

  const { data: coordo } = await supabase
    .from("users")
    .select("id")
    .eq("role", "coordonnateur")
    .eq("actif", true)
    .limit(1)
    .maybeSingle();
  if (!coordo) return { moisVerifie, anneeScolaireId: anneeEnCours.id, suspendus: [] };

  const { data: elevesData } = await supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, classe_id, classes(site_id)")
    .eq("statut", "actif");
  const elevesActifs = (elevesData ?? []) as unknown as EleveActifRef[];
  if (elevesActifs.length === 0) {
    return { moisVerifie, anneeScolaireId: anneeEnCours.id, suspendus: [] };
  }

  const { data: fraisTdRows } = await supabase.from("frais_td").select("classe_id, montant");
  const montantParClasse = new Map((fraisTdRows ?? []).map((f) => [f.classe_id as number, Number(f.montant)]));

  const { data: paiementsMois } = await supabase
    .from("paiements")
    .select("eleve_id, montant_paye")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", moisVerifie);

  const payeParEleve = new Map<number, number>();
  for (const p of paiementsMois ?? []) {
    payeParEleve.set(p.eleve_id as number, (payeParEleve.get(p.eleve_id as number) ?? 0) + (p.montant_paye as number));
  }

  const suspendus: EleveSuspenduAuto[] = [];

  for (const eleve of elevesActifs) {
    const montantAttendu = montantParClasse.get(eleve.classe_id);
    const siteId = eleve.classes?.site_id;
    if (montantAttendu === undefined || !siteId) continue;

    const paye = payeParEleve.get(eleve.id) ?? 0;
    if (paye >= montantAttendu) continue;

    const montantDu = montantAttendu - paye;

    const { error: updateError } = await supabase.from("eleves").update({ statut: "suspendu" }).eq("id", eleve.id);
    if (updateError) continue;

    await supabase.from("eleves_suspendus").insert({
      eleve_id: eleve.id,
      site_id: siteId,
      raison: "defaut_paiement",
      motif: `Defaut de paiement — ${montantDu} F restants pour le mois de ${moisVerifie}`,
      montant_du: montantDu,
      mois_souscription: moisVerifie,
      suspendu_par: coordo.id,
      annee_scolaire_id: anneeEnCours.id,
    });

    await supabase.from("notifications").insert({
      site_id: siteId,
      contenu: `Suspension automatique : ${eleve.nom} ${eleve.prenoms} (${eleve.matricule}) — défaut de paiement ${moisVerifie}, ${montantDu} F restants.`,
    });

    suspendus.push({ matricule: eleve.matricule, nom: eleve.nom, prenoms: eleve.prenoms, montantDu });
  }

  return { moisVerifie, anneeScolaireId: anneeEnCours.id, suspendus };
}
