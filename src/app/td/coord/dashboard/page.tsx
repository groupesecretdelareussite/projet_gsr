import { CalendarClock, Users, Clock3, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";

interface CreneauRow {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
  montant_prevu: number;
  statut_creneau: string;
}

/** §10.2 GSR_ARCHITECTURE.md — vue rapide de la semaine active. */
export default async function DashboardCoordTDPage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();

  const { data: semaines } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("id, libelle, statut")
    .neq("statut", "cloturee")
    .order("date_debut", { ascending: false })
    .limit(1);

  const semaineActive = semaines?.[0] ?? null;

  if (!semaineActive) {
    return (
      <div>
        <PageHeader title="Tableau de bord" subtitle="Portail TD" />
        <EmptyState icon={CalendarClock} title="Aucune semaine active" description="Créez une semaine depuis Planning pour commencer." />
      </div>
    );
  }

  const [{ data: creneaux }, { data: classes }, { data: matieres }, { data: postulations }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu, statut_creneau")
      .eq("semaine_id", semaineActive.id)
      .order("date_td")
      .order("heure_debut"),
    supabaseAdmin.schema("td").from("classes_td").select("id, nom_classe"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
    supabaseAdmin.schema("td").from("postulations").select("creneau_id, professeur_id, statut_validation"),
  ]);

  const listeCreneaux = (creneaux ?? []) as CreneauRow[];
  const nomClasseParId = new Map((classes ?? []).map((c) => [c.id, c.nom_classe]));
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));
  const toutesPostulations = postulations ?? [];

  const { data: professeurs } = await supabaseAdmin.schema("td").from("professeurs").select("id, nom, prenom");
  const nomProfParId = new Map((professeurs ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));

  const professeurValideParCreneau = new Map(
    toutesPostulations.filter((p) => p.statut_validation === "Valide").map((p) => [p.creneau_id, p.professeur_id])
  );

  const idsCreneauxSemaine = new Set(listeCreneaux.map((c) => c.id));
  const candidaturesEnAttente = toutesPostulations.filter(
    (p) => idsCreneauxSemaine.has(p.creneau_id) && p.statut_validation === "En attente"
  ).length;
  const creneauxPourvus = listeCreneaux.filter((c) => c.statut_creneau === "cloture").length;
  const budgetPrevu = listeCreneaux.reduce((sum, c) => sum + Number(c.montant_prevu), 0);

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={semaineActive.libelle} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={CalendarClock} label="Créneaux total" value={String(listeCreneaux.length)} />
        <KpiCard icon={Users} label="Créneaux pourvus" value={`${creneauxPourvus}/${listeCreneaux.length}`} />
        <KpiCard icon={Clock3} label="Candidatures en attente" value={String(candidaturesEnAttente)} />
        <KpiCard icon={Wallet} label="Budget prévu" value={`${budgetPrevu.toLocaleString("fr-FR")} F`} />
      </div>

      {listeCreneaux.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucun créneau" description="Ajoutez des créneaux depuis Planning." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          {listeCreneaux.map((c) => {
            const professeurId = professeurValideParCreneau.get(c.id);
            return (
              <div key={c.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {nomClasseParId.get(c.classe_id) ?? "—"} — {nomMatiereParId.get(c.matiere_id) ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(c.date_td).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                    {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}
                  </p>
                </div>
                {professeurId ? (
                  <Badge variant="success">{nomProfParId.get(professeurId) ?? "—"}</Badge>
                ) : (
                  <Badge variant="neutral">Non pourvu</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
