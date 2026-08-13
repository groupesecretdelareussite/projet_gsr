import { ClipboardList } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { CandidatureButtonTD } from "@/components/td/CandidatureButtonTD";

interface CreneauRow {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
  montant_prevu: number;
}

const STATUT_BADGE: Record<string, { label: string; variant: "neutral" | "success" | "danger" }> = {
  "En attente": { label: "En attente", variant: "neutral" },
  Valide: { label: "Validée", variant: "success" },
  Refuse: { label: "Refusée", variant: "danger" },
  Retiree: { label: "Retirée par le coordonnateur", variant: "danger" },
};

/** §10.7 GSR_ARCHITECTURE.md — créneaux ouverts aux candidatures (semaine publiée + créneau public). */
export default async function CandidaturesTDPage() {
  const session = await getTdProfesseurSession();
  const professeurId = session.professeurId!;
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: creneaux }, { data: classes }, { data: matieres }, { data: mesPostulations }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu, semaines!inner(statut)")
      .eq("statut_creneau", "public")
      .eq("semaines.statut", "publiee")
      .order("date_td")
      .order("heure_debut"),
    supabaseAdmin.from("classes").select("id, nom_classe, sites(nom_site)"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
    supabaseAdmin.schema("td").from("postulations").select("id, creneau_id, statut_validation").eq("professeur_id", professeurId),
  ]);

  const listeCreneaux = (creneaux ?? []) as unknown as CreneauRow[];
  const nomClasseParId = new Map(
    ((classes ?? []) as unknown as { id: number; nom_classe: string; sites: { nom_site: string } | null }[]).map((c) => [
      c.id,
      `${c.sites?.nom_site ?? "—"} — ${c.nom_classe}`,
    ])
  );
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));
  const postulationParCreneau = new Map((mesPostulations ?? []).map((p) => [p.creneau_id, p]));

  return (
    <div>
      <PageHeader title="Candidatures" subtitle="Créneaux ouverts cette semaine" />

      {listeCreneaux.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun créneau ouvert" description="Revenez lorsqu'une semaine sera publiée." />
      ) : (
        <div className="space-y-2">
          {listeCreneaux.map((c) => {
            const maPostulation = postulationParCreneau.get(c.id);
            const badge = maPostulation ? STATUT_BADGE[maPostulation.statut_validation] : null;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {nomClasseParId.get(c.classe_id) ?? "—"} — {nomMatiereParId.get(c.matiere_id) ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(c.date_td).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                    {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)} · {Number(c.montant_prevu).toLocaleString("fr-FR")} F
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                  <CandidatureButtonTD
                    creneauId={c.id}
                    postulationId={maPostulation?.id ?? null}
                    statutValidation={maPostulation?.statut_validation ?? null}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
