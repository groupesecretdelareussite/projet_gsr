import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ArbitrageButtonTD } from "@/components/td/ArbitrageButtonTD";

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
  professeur_id: number;
  statut_validation: string;
}

/** §10.4 GSR_ARCHITECTURE.md — créneaux publiés encore ouverts, avec au moins une candidature à trancher. */
export default async function ArbitrageTDPage() {
  await getUserScope(createClient());
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: creneaux }, { data: classes }, { data: matieres }, { data: professeurs }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu")
      .eq("statut_creneau", "public")
      .order("date_td")
      .order("heure_debut"),
    supabaseAdmin.schema("td").from("classes_td").select("id, nom_classe"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
    supabaseAdmin.schema("td").from("professeurs").select("id, nom, prenom"),
  ]);

  const listeCreneaux = (creneaux ?? []) as CreneauRow[];
  const nomClasseParId = new Map((classes ?? []).map((c) => [c.id, c.nom_classe]));
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));
  const nomProfParId = new Map((professeurs ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));

  const idsCreneaux = listeCreneaux.map((c) => c.id);
  let postulations: PostulationRow[] = [];
  if (idsCreneaux.length > 0) {
    const { data } = await supabaseAdmin
      .schema("td")
      .from("postulations")
      .select("id, creneau_id, professeur_id, statut_validation")
      .in("creneau_id", idsCreneaux)
      .order("date_postulation");
    postulations = (data ?? []) as PostulationRow[];
  }

  const creneauxAvecCandidats = listeCreneaux
    .map((c) => ({ creneau: c, candidats: postulations.filter((p) => p.creneau_id === c.id) }))
    .filter((c) => c.candidats.length > 0);

  return (
    <div>
      <PageHeader title="Arbitrage" subtitle="Candidatures en attente sur les créneaux publiés" />

      {creneauxAvecCandidats.length === 0 ? (
        <EmptyState icon={Gavel} title="Aucune candidature à arbitrer" description="Les créneaux publiés sans candidature n'apparaissent pas ici." />
      ) : (
        <div className="space-y-4">
          {creneauxAvecCandidats.map(({ creneau, candidats }) => (
            <div key={creneau.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="mb-4">
                <p className="font-bold text-gray-900">
                  {nomClasseParId.get(creneau.classe_id) ?? "—"} — {nomMatiereParId.get(creneau.matiere_id) ?? "—"}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(creneau.date_td).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                  {creneau.heure_debut.slice(0, 5)}–{creneau.heure_fin.slice(0, 5)} · {Number(creneau.montant_prevu).toLocaleString("fr-FR")} F
                </p>
              </div>
              <div className="space-y-2">
                {candidats.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium text-gray-800">{nomProfParId.get(p.professeur_id) ?? "—"}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">En attente</Badge>
                      <ArbitrageButtonTD creneauId={creneau.id} professeurId={p.professeur_id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
