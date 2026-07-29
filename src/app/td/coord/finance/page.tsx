import Link from "next/link";
import { Wallet, Users, CalendarClock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { cn } from "@/lib/utils";

interface SemaineRow {
  id: number;
  libelle: string;
  date_debut: string;
}

interface CreneauFinance {
  id: number;
  classe_id: number;
  montant_prevu: number;
  professeur_id: number;
}

/**
 * §10.5/§11 GSR_ARCHITECTURE.md — uniquement les semaines clôturées ; un
 * créneau clôturé sans professeur validé (jamais pourvu) n'est pas compté
 * comme une dépense, même raisonnement que la Comptabilité globale.
 */
export default async function FinanceTDPage({ searchParams }: { searchParams: { semaine?: string } }) {
  await getUserScope(createClient());
  const supabaseAdmin = createServiceRoleClient();

  const { data: semaines } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("id, libelle, date_debut")
    .eq("statut", "cloturee")
    .order("date_debut", { ascending: false });
  const listeSemaines = (semaines ?? []) as SemaineRow[];

  const semaineId = searchParams.semaine ? Number(searchParams.semaine) : listeSemaines[0]?.id;
  const semaineActive = listeSemaines.find((s) => s.id === semaineId) ?? null;

  return (
    <div>
      <PageHeader title="Finance" subtitle="Suivi financier par semaine clôturée" />

      {listeSemaines.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune semaine clôturée" description="La finance apparaît une fois une semaine clôturée." />
      ) : (
        <>
          <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
            {listeSemaines.map((s) => (
              <Link
                key={s.id}
                href={`/td/coord/finance?semaine=${s.id}`}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                  s.id === semaineActive?.id ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {s.libelle}
              </Link>
            ))}
          </div>
          {semaineActive && <FinanceSemaine supabaseAdmin={supabaseAdmin} semaineId={semaineActive.id} />}
        </>
      )}
    </div>
  );
}

async function FinanceSemaine({
  supabaseAdmin,
  semaineId,
}: {
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>;
  semaineId: number;
}) {
  const [{ data: creneaux }, { data: postulations }, { data: classes }, { data: professeurs }] = await Promise.all([
    supabaseAdmin.schema("td").from("creneaux").select("id, classe_id, montant_prevu").eq("semaine_id", semaineId).eq("statut_creneau", "cloture"),
    supabaseAdmin.schema("td").from("postulations").select("creneau_id, professeur_id").eq("statut_validation", "Valide"),
    supabaseAdmin.schema("td").from("classes_td").select("id, nom_classe"),
    supabaseAdmin.schema("td").from("professeurs").select("id, nom, prenom"),
  ]);

  const professeurParCreneau = new Map((postulations ?? []).map((p) => [p.creneau_id, p.professeur_id]));
  const nomClasseParId = new Map((classes ?? []).map((c) => [c.id, c.nom_classe]));
  const nomProfParId = new Map((professeurs ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));

  const pourvus: (CreneauFinance & { professeur_id: number })[] = (creneaux ?? [])
    .map((c) => ({ ...c, professeur_id: professeurParCreneau.get(c.id) ?? 0 }))
    .filter((c) => c.professeur_id !== 0);

  const totalRemunerations = pourvus.reduce((sum, c) => sum + Number(c.montant_prevu), 0);
  const professeursImpliques = new Set(pourvus.map((c) => c.professeur_id)).size;
  const montantMoyen = pourvus.length > 0 ? Math.round(totalRemunerations / pourvus.length) : 0;

  const parProfesseur = new Map<number, { nbCreneaux: number; total: number }>();
  const parClasse = new Map<number, { nbCreneaux: number; total: number }>();
  for (const c of pourvus) {
    const p = parProfesseur.get(c.professeur_id) ?? { nbCreneaux: 0, total: 0 };
    p.nbCreneaux += 1;
    p.total += Number(c.montant_prevu);
    parProfesseur.set(c.professeur_id, p);

    const cl = parClasse.get(c.classe_id) ?? { nbCreneaux: 0, total: 0 };
    cl.nbCreneaux += 1;
    cl.total += Number(c.montant_prevu);
    parClasse.set(c.classe_id, cl);
  }

  const lignesProfesseur = Array.from(parProfesseur.entries()).map(([id, v]) => ({ id, nom: nomProfParId.get(id) ?? "—", ...v }));
  const lignesClasse = Array.from(parClasse.entries()).map(([id, v]) => ({ id, nom: nomClasseParId.get(id) ?? "—", ...v }));

  const colonnesProfesseur: DataTableColumn<(typeof lignesProfesseur)[number]>[] = [
    { key: "nom", label: "Professeur", render: (l) => l.nom },
    { key: "nb", label: "Créneaux", render: (l) => String(l.nbCreneaux) },
    { key: "total", label: "Total", render: (l) => `${l.total.toLocaleString("fr-FR")} F` },
  ];

  const colonnesClasse: DataTableColumn<(typeof lignesClasse)[number]>[] = [
    { key: "nom", label: "Classe", render: (l) => l.nom },
    { key: "nb", label: "Créneaux", render: (l) => String(l.nbCreneaux) },
    { key: "total", label: "Total", render: (l) => `${l.total.toLocaleString("fr-FR")} F` },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Wallet} label="Total rémunérations" value={`${totalRemunerations.toLocaleString("fr-FR")} F`} />
        <KpiCard icon={CalendarClock} label="Créneaux pourvus" value={String(pourvus.length)} />
        <KpiCard icon={Users} label="Professeurs mobilisés" value={String(professeursImpliques)} />
        <KpiCard icon={TrendingUp} label="Montant moyen / créneau" value={`${montantMoyen.toLocaleString("fr-FR")} F`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Par professeur</h2>
          <DataTable
            columns={colonnesProfesseur}
            rows={lignesProfesseur}
            rowKey={(l) => l.id}
            emptyState={<EmptyState icon={Users} title="Aucune donnée" description="Aucun créneau pourvu cette semaine." />}
          />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Par classe</h2>
          <DataTable
            columns={colonnesClasse}
            rows={lignesClasse}
            rowKey={(l) => l.id}
            emptyState={<EmptyState icon={CalendarClock} title="Aucune donnée" description="Aucun créneau pourvu cette semaine." />}
          />
        </div>
      </div>
    </div>
  );
}
