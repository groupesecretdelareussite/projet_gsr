import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  CandidaturesTDView,
  type CreneauItemTD,
  type MatiereOptionTD,
  type PostulationItemTD,
} from "@/components/td/CandidaturesTDView";

interface CreneauRow {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
  montant_prevu: number;
}

interface PostulationRow {
  id: number;
  creneau_id: number;
  statut_validation: string;
}

/** §10.7 GSR_ARCHITECTURE.md — créneaux ouverts aux candidatures (semaine publiée + créneau public). */
export default async function CandidaturesTDPage() {
  const session = await getTdProfesseurSession();
  const professeurId = session.professeurId!;
  const supabaseAdmin = createServiceRoleClient();

  const [
    { data: creneaux },
    { data: classes },
    { data: matieres },
    { data: mesPostulations },
    { data: prof },
  ] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu, semaines!inner(statut)")
      .eq("statut_creneau", "public")
      .eq("semaines.statut", "publiee")
      .order("date_td")
      .order("heure_debut"),
    supabaseAdmin.from("classes").select("id, nom_classe, sites(nom_site)"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
    supabaseAdmin.schema("td").from("postulations").select("id, creneau_id, statut_validation").eq("professeur_id", professeurId),
    supabaseAdmin.schema("td").from("professeurs").select("matiere_principale_id").eq("id", professeurId).maybeSingle(),
  ]);

  const listeCreneaux = (creneaux ?? []) as unknown as CreneauRow[];
  const idsCreneaux = listeCreneaux.map((c) => c.id);

  const { data: candidaturesActives } = idsCreneaux.length > 0
    ? await supabaseAdmin
        .schema("td")
        .from("postulations")
        .select("creneau_id")
        .in("creneau_id", idsCreneaux)
        .eq("statut_validation", "En attente")
    : { data: [] };

  const nombreCandidatsParCreneau: Record<number, number> = {};
  for (const cand of (candidaturesActives ?? [])) {
    nombreCandidatsParCreneau[cand.creneau_id] = (nombreCandidatsParCreneau[cand.creneau_id] ?? 0) + 1;
  }

  const nomClasseParId = new Map(
    ((classes ?? []) as unknown as { id: number; nom_classe: string; sites: { nom_site: string } | null }[]).map((c) => [
      c.id,
      `${c.sites?.nom_site ?? "—"} — ${c.nom_classe}`,
    ])
  );
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));

  const postulationParCreneau: Record<number, PostulationItemTD> = {};
  for (const p of ((mesPostulations ?? []) as unknown as PostulationRow[])) {
    postulationParCreneau[p.creneau_id] = {
      id: p.id,
      statutValidation: p.statut_validation,
    };
  }

  const creneauxItems: CreneauItemTD[] = listeCreneaux.map((c) => ({
    id: c.id,
    classeId: c.classe_id,
    matiereId: c.matiere_id,
    nomClasse: nomClasseParId.get(c.classe_id) ?? "—",
    nomMatiere: nomMatiereParId.get(c.matiere_id) ?? "—",
    dateTd: c.date_td,
    heureDebut: c.heure_debut,
    heureFin: c.heure_fin,
    montantPrevu: Number(c.montant_prevu),
  }));

  const matieresOptions: MatiereOptionTD[] = (matieres ?? []).map((m) => ({
    id: m.id,
    nomMatiere: m.nom_matiere,
  }));

  const matierePrincipaleId = prof?.matiere_principale_id ?? null;
  const matierePrincipaleNom = matierePrincipaleId
    ? nomMatiereParId.get(matierePrincipaleId) ?? null
    : null;

  return (
    <div>
      <PageHeader title="Candidatures" subtitle="Créneaux ouverts cette semaine" />
      <CandidaturesTDView
        creneaux={creneauxItems}
        matieres={matieresOptions}
        matierePrincipaleId={matierePrincipaleId}
        matierePrincipaleNom={matierePrincipaleNom}
        postulationParCreneau={postulationParCreneau}
        nombreCandidatsParCreneau={nombreCandidatsParCreneau}
      />
    </div>
  );
}
