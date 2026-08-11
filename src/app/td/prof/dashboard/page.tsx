import { LayoutDashboard, Wallet, CalendarClock } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { EmptyState } from "@/components/admin/EmptyState";

interface CreneauRow {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
  montant_prevu: number;
}

/** §10.7 GSR_ARCHITECTURE.md — affectations confirmées + historique + total cumulé. */
export default async function DashboardProfesseurPage() {
  const session = await getTdProfesseurSession();
  const professeurId = session.professeurId!;
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: postulations }, { data: classes }, { data: matieres }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("postulations")
      .select("creneau_id, creneaux(id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu)")
      .eq("professeur_id", professeurId)
      .eq("statut_validation", "Valide"),
    supabaseAdmin.from("classes").select("id, nom_classe, sites(nom_site)"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
  ]);

  const nomClasseParId = new Map(
    ((classes ?? []) as unknown as { id: number; nom_classe: string; sites: { nom_site: string } | null }[]).map((c) => [
      c.id,
      `${c.sites?.nom_site ?? "—"} — ${c.nom_classe}`,
    ])
  );
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));

  const affectations = ((postulations ?? []) as unknown as { creneaux: CreneauRow | null }[])
    .map((p) => p.creneaux)
    .filter((c): c is CreneauRow => c !== null)
    .sort((a, b) => (a.date_td < b.date_td ? 1 : -1));

  const totalCumule = affectations.reduce((sum, c) => sum + Number(c.montant_prevu), 0);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const aVenir = affectations.filter((c) => c.date_td >= aujourdHui);
  const historique = affectations.filter((c) => c.date_td < aujourdHui);

  const moisCourant = aujourdHui.slice(0, 7); // "YYYY-MM"
  const totalCumuleMois = affectations
    .filter((c) => c.date_td.slice(0, 7) === moisCourant)
    .reduce((sum, c) => sum + Number(c.montant_prevu), 0);

  function Ligne({ c }: { c: CreneauRow }) {
    return (
      <div className="border border-gray-100 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {nomClasseParId.get(c.classe_id) ?? "—"} — {nomMatiereParId.get(c.matiere_id) ?? "—"}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(c.date_td).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">{Number(c.montant_prevu).toLocaleString("fr-FR")} F</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Bonjour, ${session.prenom} ${session.nom}`} subtitle="Voici un aperçu de vos affectations TD." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={LayoutDashboard} label="Affectations à venir" value={String(aVenir.length)} />
        <KpiCard icon={CalendarClock} label="Total cumulé du mois" value={`${totalCumuleMois.toLocaleString("fr-FR")} F`} />
        <KpiCard icon={Wallet} label="Total cumulé" value={`${totalCumule.toLocaleString("fr-FR")} F`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Affectations à venir</h2>
          {aVenir.length === 0 ? (
            <EmptyState icon={LayoutDashboard} title="Aucune affectation" description="Postulez sur un créneau ouvert." />
          ) : (
            <div className="space-y-2">
              {aVenir.map((c) => (
                <Ligne key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Historique</h2>
          {historique.length === 0 ? (
            <EmptyState icon={LayoutDashboard} title="Aucun historique" description="Vos séances passées apparaîtront ici." />
          ) : (
            <div className="space-y-2">
              {historique.map((c) => (
                <Ligne key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
