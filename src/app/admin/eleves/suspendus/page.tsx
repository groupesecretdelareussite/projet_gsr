import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { type MoisScolaire } from "@/lib/constants";
import { estVenuDansLeMois } from "@/lib/reinscription";
import { SuspendusClient, type EleveSuspenduRow } from "@/components/admin/eleves/SuspendusClient";

interface RawSuspension {
  raison: string;
  motif: string;
  montant_du: number;
  mois_souscription: string | null;
  date_suspension: string;
}

function extraireSuspension(raw: unknown): RawSuspension | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return (raw[0] as RawSuspension) ?? null;
  }
  return raw as RawSuspension;
}


export default async function ElevesSuspendusPage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  // §discussion 2026-08-16 : chef_site/secretaire voient désormais cette page
  // (accessible depuis le bouton sur Élèves > Liste), mais sans Réinscrire ni
  // Exporter — même périmètre que le reste de leurs droits.
  const peutGerer = ["coordonnateur", "comptable", "superviseur"].includes(scope.role);
  const peutExporter = peutGerer;

  const [{ data: eleves }, { data: anneeEnCours }] = await Promise.all([
    supabase
      .from("eleves")
      .select(
        "id, matricule, nom, prenoms, classes(nom_classe, sites(nom_site)), eleves_suspendus(raison, motif, montant_du, mois_souscription, date_suspension)"
      )
      .eq("statut", "suspendu")
      .order("nom"),
    supabase.from("annees_scolaires").select("date_debut").eq("statut", "en_cours").maybeSingle(),
  ]);

  const rows: EleveSuspenduRow[] = await Promise.all(
    ((eleves ?? []) as unknown as Array<{
      id: number;
      matricule: string;
      nom: string;
      prenoms: string;
      classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
      eleves_suspendus: unknown;
    }>).map(async (e) => {
      const suspension = extraireSuspension(e.eleves_suspendus);
      const doitVerifier = suspension?.raison === "defaut_paiement" && suspension.montant_du > 0 && suspension.mois_souscription && anneeEnCours;
      const estVenu = doitVerifier
        ? await estVenuDansLeMois(supabase, e.id, suspension.mois_souscription as MoisScolaire, anneeEnCours.date_debut)
        : null;
      return {
        id: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenoms: e.prenoms,
        classes: e.classes,
        suspension,
        estVenuDansLeMois: estVenu,
      };
    })
  );

  const dateExport = new Date().toLocaleDateString("fr-FR");

  return (
    <div>
      <PageHeader
        title="Élèves suspendus"
        subtitle={`${rows.length} élève(s) suspendu(s)`}
      />
      <SuspendusClient
        rowsInitiales={rows}
        peutGerer={peutGerer}
        peutExporter={peutExporter}
        dateExport={dateExport}
      />
    </div>
  );
}
