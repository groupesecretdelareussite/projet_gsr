import { redirect } from "next/navigation";
import { GraduationCap, AlertTriangle, ClipboardCheck } from "lucide-react";
import { getParentSession } from "@/lib/session-parent";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { resteAPayer } from "@/lib/paiements";
import { MOIS_SCOLAIRES, RAISON_LABELS, type MoisScolaire, type RaisonSuspensionManuelle } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { DeconnexionParentButton } from "@/components/parents/DeconnexionParentButton";
import { ParentInactivityWatcher } from "@/components/parents/ParentInactivityWatcher";

interface EleveDashboard {
  nom: string;
  prenoms: string;
  matricule: string;
  statut: "actif" | "suspendu";
  classe_id: number;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

function estDansLeMoisCourant(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default async function DashboardParentPage({
  searchParams,
}: {
  searchParams: { annee_id?: string };
}) {
  const session = await getParentSession();
  if (!session.matricule) {
    redirect("/portail-parents");
  }
  const matricule = session.matricule;

  const supabaseAdmin = createServiceRoleClient();
  const { data: eleveData } = await supabaseAdmin
    .from("eleves")
    .select("nom, prenoms, matricule, statut, classe_id, classes(nom_classe, sites(nom_site))")
    .eq("matricule", matricule)
    .maybeSingle();

  if (!eleveData) {
    redirect("/portail-parents");
  }
  const eleve = eleveData as unknown as EleveDashboard;
  const nomClasse = eleve.classes?.nom_classe ?? "—";
  const nomSite = eleve.classes?.sites?.nom_site ?? "—";

  return (
    <div className="min-h-screen bg-surface px-4 sm:px-6 py-10">
      <ParentInactivityWatcher />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-gradient flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {eleve.nom} {eleve.prenoms}
              </h1>
              <p className="text-sm text-gray-500">
                {nomClasse} — {nomSite} · Matricule {eleve.matricule}
              </p>
            </div>
          </div>
          <DeconnexionParentButton />
        </div>

        {eleve.statut === "suspendu" ? (
          <SuspensionCard matricule={eleve.matricule} />
        ) : (
          <ActifDashboard eleveNom={eleve.nom} classeId={eleve.classe_id} matricule={eleve.matricule} anneeIdSelectionnee={searchParams.annee_id} />
        )}
      </div>
    </div>
  );
}

async function SuspensionCard({ matricule }: { matricule: string }) {
  const supabaseAdmin = createServiceRoleClient();

  // §4/§9 — eleves_suspendus référence eleve_id, pas matricule ; on repasse par l'id.
  const { data: eleve } = await supabaseAdmin.from("eleves").select("id").eq("matricule", matricule).maybeSingle();
  const { data: suspension } = eleve
    ? await supabaseAdmin
        .from("eleves_suspendus")
        .select("raison, motif, montant_du")
        .eq("eleve_id", eleve.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Élève suspendu</h2>
      </div>
      {suspension ? (
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-gray-500">Raison : </span>
            <span className="font-medium text-gray-800">
              {RAISON_LABELS[suspension.raison as RaisonSuspensionManuelle]}
            </span>
          </p>
          <p>
            <span className="text-gray-500">Motif : </span>
            <span className="font-medium text-gray-800">{suspension.motif}</span>
          </p>
          {suspension.montant_du > 0 && (
            <p>
              <span className="text-gray-500">Montant dû : </span>
              <span className="font-semibold text-red-600">{Number(suspension.montant_du).toLocaleString("fr-FR")} F</span>
            </p>
          )}
          <p className="text-gray-500 pt-2">Contactez l&apos;établissement pour plus d&apos;informations.</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Contactez l&apos;établissement pour plus d&apos;informations.</p>
      )}
    </div>
  );
}

async function ActifDashboard({
  classeId,
  matricule,
  anneeIdSelectionnee,
}: {
  eleveNom: string;
  classeId: number;
  matricule: string;
  anneeIdSelectionnee?: string;
}) {
  const supabaseAdmin = createServiceRoleClient();

  const { data: eleve } = await supabaseAdmin.from("eleves").select("id").eq("matricule", matricule).maybeSingle();
  if (!eleve) return null;

  const [{ data: annees }, { data: frais }] = await Promise.all([
    supabaseAdmin.from("annees_scolaires").select("id, libelle, statut").order("date_debut", { ascending: false }),
    supabaseAdmin.from("frais_td").select("montant").eq("classe_id", classeId).maybeSingle(),
  ]);

  const anneesList = annees ?? [];
  const anneeSelectionnee =
    (anneeIdSelectionnee ? anneesList.find((a) => a.id === Number(anneeIdSelectionnee)) : undefined) ??
    anneesList.find((a) => a.statut === "en_cours") ??
    anneesList[0];

  const montantAttendu = frais ? Number(frais.montant) : 0;

  let lignesMois: { mois: MoisScolaire; statut: "Soldé" | "Partiel" | "Non payé" }[] = [];
  let presences: { date_presence: string; present: boolean }[] = [];

  if (anneeSelectionnee) {
    const [{ data: paiements }, { data: presencesData }] = await Promise.all([
      supabaseAdmin
        .from("paiements")
        .select("montant_paye, mois_souscription")
        .eq("eleve_id", eleve.id)
        .eq("annee_scolaire_id", anneeSelectionnee.id),
      supabaseAdmin
        .from("presences")
        .select("date_presence, present")
        .eq("eleve_id", eleve.id)
        .eq("annee_scolaire_id", anneeSelectionnee.id)
        .order("date_presence", { ascending: false }),
    ]);

    lignesMois = MOIS_SCOLAIRES.map((mois) => {
      const paiementsDuMois = (paiements ?? []).filter((p) => p.mois_souscription === mois);
      const totalPaye = paiementsDuMois.reduce((s, p) => s + p.montant_paye, 0);
      const reste = resteAPayer(montantAttendu, paiementsDuMois);
      const statut = reste <= 0 && montantAttendu > 0 ? "Soldé" : totalPaye > 0 ? "Partiel" : "Non payé";
      return { mois, statut };
    });

    presences = presencesData ?? [];
  }

  const presencesCeMois = presences.filter((p) => estDansLeMoisCourant(p.date_presence));
  const tauxCeMois =
    presencesCeMois.length > 0
      ? Math.round((presencesCeMois.filter((p) => p.present).length / presencesCeMois.length) * 100)
      : null;

  const badgeVariant = { Soldé: "success", Partiel: "warning", "Non payé": "danger" } as const;

  return (
    <div className="space-y-6">
      {anneesList.length > 1 && (
        <form method="get" className="flex justify-end gap-2">
          <select
            name="annee_id"
            defaultValue={anneeSelectionnee?.id ?? ""}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {anneesList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </select>
          <button type="submit" className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">
            Afficher
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Paiements TD {anneeSelectionnee ? `— ${anneeSelectionnee.libelle}` : ""}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {lignesMois.map(({ mois, statut }) => (
            <div key={mois} className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1.5">{mois}</p>
              <Badge variant={badgeVariant[statut]}>{statut}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Présences</h2>
          {tauxCeMois !== null && (
            <div className="flex items-center gap-2 text-sm">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <span className="font-semibold text-gray-800">{tauxCeMois}%</span>
              <span className="text-gray-400">ce mois-ci</span>
            </div>
          )}
        </div>
        {presences.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune présence enregistrée pour cette année.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {presences.map((p) => (
              <div key={p.date_presence} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-600">
                  {new Date(p.date_presence).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
                <Badge variant={p.present ? "success" : "danger"}>{p.present ? "Présent" : "Absent"}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
