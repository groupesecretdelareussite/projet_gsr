import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NouvelleSemaineTDDialog } from "@/components/td/NouvelleSemaineTDDialog";
import { NouveauCreneauTDDialog } from "@/components/td/NouveauCreneauTDDialog";
import { SemaineActionsTD } from "@/components/td/SemaineActionsTD";
import { SupprimerCreneauTDButton } from "@/components/td/SupprimerCreneauTDButton";

interface SemaineRow {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: "brouillon" | "publiee" | "cloturee";
}

interface CreneauRow {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
  montant_prevu: number;
  statut_creneau: "brouillon" | "public" | "cloture";
}

const STATUT_SEMAINE_BADGE: Record<SemaineRow["statut"], { label: string; variant: "neutral" | "success" | "danger" }> = {
  brouillon: { label: "Brouillon", variant: "neutral" },
  publiee: { label: "Publiée", variant: "success" },
  cloturee: { label: "Clôturée", variant: "danger" },
};

const STATUT_CRENEAU_BADGE: Record<CreneauRow["statut_creneau"], { label: string; variant: "neutral" | "success" | "danger" }> = {
  brouillon: { label: "Brouillon", variant: "neutral" },
  public: { label: "Public", variant: "success" },
  cloture: { label: "Clôturé", variant: "danger" },
};

export default async function PlanningTDPage(props: { searchParams: Promise<{ semaine?: string }> }) {
  const searchParams = await props.searchParams;
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();

  const { data: semaines } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("id, libelle, date_debut, date_fin, statut")
    .order("date_debut", { ascending: false });
  const listeSemaines = (semaines ?? []) as SemaineRow[];

  const semaineId = searchParams.semaine ? Number(searchParams.semaine) : listeSemaines[0]?.id;
  const semaineActive = listeSemaines.find((s) => s.id === semaineId) ?? null;

  const [{ data: classes }, { data: matieres }] = await Promise.all([
    supabaseAdmin.schema("td").from("classes_td").select("id, nom_classe").order("nom_classe"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
  ]);
  const classesOptions = (classes ?? []).map((c) => ({ id: c.id, nom: c.nom_classe }));
  const matieresOptions = (matieres ?? []).map((m) => ({ id: m.id, nom: m.nom_matiere }));
  const nomClasseParId = new Map(classesOptions.map((c) => [c.id, c.nom]));
  const nomMatiereParId = new Map(matieresOptions.map((m) => [m.id, m.nom]));

  let creneaux: CreneauRow[] = [];
  if (semaineActive) {
    const { data } = await supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu, statut_creneau")
      .eq("semaine_id", semaineActive.id)
      .order("date_td")
      .order("heure_debut");
    creneaux = (data ?? []) as CreneauRow[];
  }

  return (
    <div>
      <PageHeader title="Planning" subtitle="Semaines et créneaux TD" actions={<NouvelleSemaineTDDialog />} />

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-fit">
          {listeSemaines.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Aucune semaine" description="Créez la première semaine TD." />
          ) : (
            <div className="divide-y divide-gray-100">
              {listeSemaines.map((s) => {
                const badge = STATUT_SEMAINE_BADGE[s.statut];
                return (
                  <Link
                    key={s.id}
                    href={`/td/coord/planning?semaine=${s.id}`}
                    className={cn("block px-4 py-3 hover:bg-gray-50 transition-colors", s.id === semaineActive?.id && "bg-primary/5")}
                  >
                    <p className="text-sm font-medium text-gray-900">{s.libelle}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">
                        {new Date(s.date_debut).toLocaleDateString("fr-FR")} — {new Date(s.date_fin).toLocaleDateString("fr-FR")}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {!semaineActive ? (
            <EmptyState icon={CalendarClock} title="Aucune semaine sélectionnée" description="Choisissez une semaine à gauche." />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-bold text-gray-900">{semaineActive.libelle}</h2>
                  <p className="text-xs text-gray-400">
                    {new Date(semaineActive.date_debut).toLocaleDateString("fr-FR")} —{" "}
                    {new Date(semaineActive.date_fin).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {semaineActive.statut === "brouillon" && (
                    <NouveauCreneauTDDialog
                      semaineId={semaineActive.id}
                      dateDebut={semaineActive.date_debut}
                      dateFin={semaineActive.date_fin}
                      classes={classesOptions}
                      matieres={matieresOptions}
                    />
                  )}
                  <SemaineActionsTD semaineId={semaineActive.id} statut={semaineActive.statut} />
                </div>
              </div>

              {creneaux.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Aucun créneau" description="Ajoutez le premier créneau de cette semaine." />
              ) : (
                <div className="space-y-2">
                  {creneaux.map((c) => {
                    const badge = STATUT_CRENEAU_BADGE[c.statut_creneau];
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-lg px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {nomClasseParId.get(c.classe_id) ?? "—"} — {nomMatiereParId.get(c.matiere_id) ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(c.date_td).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                            {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)} · {Number(c.montant_prevu).toLocaleString("fr-FR")} F
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {c.statut_creneau === "brouillon" && <SupprimerCreneauTDButton creneauId={c.id} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
