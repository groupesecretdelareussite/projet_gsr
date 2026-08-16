import { Users, UserX, UserPlus, GraduationCap, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { moisCourant, moisPrecedent, moisVisiblesRetard, resteAPayer } from "@/lib/paiements";
import type { MoisScolaire } from "@/lib/constants";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { DashboardChart } from "@/components/admin/DashboardChart";
import { AlertesPanel, type Alerte } from "@/components/admin/AlertesPanel";

interface EleveDashboard {
  id: number;
  classe_id: number;
  date_inscription: string;
  classes: { nom_classe: string } | null;
}

/** Variation en % entre deux comptages ; `null` si la base de comparaison est à 0 (rien d'honnête à afficher). */
function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return null;
  return ((actuel - precedent) / precedent) * 100;
}

function appartientAuMois(dateIso: string, reference: Date): boolean {
  const d = new Date(dateIso);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

/** Nombre d'élèves actifs dont le reste dû est > 0 pour le mois donné. */
function compterNonAJour(
  elevesActifs: EleveDashboard[],
  montantParClasse: Map<number, number>,
  paiementsParEleveMois: Map<string, { montant_paye: number }[]>,
  mois: MoisScolaire
): number {
  return elevesActifs.filter((e) => {
    const montantAttendu = montantParClasse.get(e.classe_id);
    if (montantAttendu === undefined) return false;
    return resteAPayer(montantAttendu, paiementsParEleveMois.get(`${e.id}-${mois}`) ?? []) > 0;
  }).length;
}

/**
 * §8.2 GSR_ARCHITECTURE.md. Client RLS uniquement (`createClient()`) : la
 * policy `eleves_acces` filtre déjà par site pour superviseur/chef_site, pas
 * besoin de service role ni de filtre manuel supplémentaire ici.
 */
export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const nomAffiche = scope.username.charAt(0).toUpperCase() + scope.username.slice(1);

  const { data: eleves } = await supabase
    .from("eleves")
    .select("id, classe_id, date_inscription, classes(nom_classe)")
    .eq("statut", "actif");

  const elevesActifs = (eleves ?? []) as unknown as EleveDashboard[];
  const maintenant = new Date();

  // --- Nouveaux élèves ce mois / mois précédent (calendaire) ---
  const moisPrecedentCalendaire = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const nouveauxCeMois = elevesActifs.filter((e) => appartientAuMois(e.date_inscription, maintenant)).length;
  const nouveauxMoisPrecedent = elevesActifs.filter((e) =>
    appartientAuMois(e.date_inscription, moisPrecedentCalendaire)
  ).length;
  const variationNouveaux = variation(nouveauxCeMois, nouveauxMoisPrecedent);

  // --- Non à jour + alerte retard — §discussion 2026-08-16 : le KPI "Non à
  // jour" s'ouvre à chef_site ET secretaire, mais le panneau d'alerte (lien
  // direct vers Paiements > En retard) reste borné à qui peut réellement
  // accéder à cette page — chef_site seul, pas secretaire (cf. PaiementsNav).
  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";
  const peutVoirKpiNonAJour =
    scope.role === "coordonnateur" || scope.role === "comptable" || scope.role === "superviseur" || estChefSiteOuSecretaire;
  const peutVoirAlertePaiements =
    scope.role === "coordonnateur" || scope.role === "comptable" || scope.role === "superviseur" || scope.role === "chef_site";

  const { data: anneeEnCours } = await supabase
    .from("annees_scolaires")
    .select("id, libelle, date_debut, date_fin")
    .eq("statut", "en_cours")
    .single();

  const mois = moisCourant(maintenant);
  let nonAJourCeMois = 0;
  let variationNonAJour: number | null = null;
  const alertes: Alerte[] = [];

  if (peutVoirKpiNonAJour && mois && elevesActifs.length > 0) {
    if (anneeEnCours) {
      const moisPrec = moisPrecedent(mois);
      const moisVisiblesRetardCourant = moisVisiblesRetard(maintenant, {
        dateDebut: anneeEnCours.date_debut,
        dateFin: anneeEnCours.date_fin,
      });

      // Union des mois nécessaires aux deux calculs (KPI + alerte) — une seule requête paiements.
      const moisNecessaires = Array.from(
        new Set([mois, ...(moisPrec ? [moisPrec] : []), ...moisVisiblesRetardCourant])
      );

      const [{ data: fraisTd }, { data: paiements }] = await Promise.all([
        supabase.from("frais_td").select("classe_id, montant"),
        supabase
          .from("paiements")
          .select("eleve_id, montant_paye, mois_souscription")
          .eq("annee_scolaire_id", anneeEnCours.id)
          .in("mois_souscription", moisNecessaires),
      ]);

      const montantParClasse = new Map((fraisTd ?? []).map((f) => [f.classe_id, Number(f.montant)]));

      const paiementsParEleveMois = new Map<string, { montant_paye: number }[]>();
      for (const p of paiements ?? []) {
        const cle = `${p.eleve_id}-${p.mois_souscription}`;
        const liste = paiementsParEleveMois.get(cle) ?? [];
        liste.push({ montant_paye: p.montant_paye });
        paiementsParEleveMois.set(cle, liste);
      }

      nonAJourCeMois = compterNonAJour(elevesActifs, montantParClasse, paiementsParEleveMois, mois);

      if (moisPrec) {
        const nonAJourMoisPrecedent = compterNonAJour(elevesActifs, montantParClasse, paiementsParEleveMois, moisPrec);
        variationNonAJour = variation(nonAJourCeMois, nonAJourMoisPrecedent);
      }

      // --- Alerte "Retard de paiement" (élèves distincts en retard, règle du 15) ---
      if (moisVisiblesRetardCourant.length > 0) {
        const elevesEnRetard = new Set<number>();
        for (const e of elevesActifs) {
          const montantAttendu = montantParClasse.get(e.classe_id);
          if (montantAttendu === undefined) continue;
          for (const m of moisVisiblesRetardCourant) {
            if (resteAPayer(montantAttendu, paiementsParEleveMois.get(`${e.id}-${m}`) ?? []) > 0) {
              elevesEnRetard.add(e.id);
              break;
            }
          }
        }

        if (elevesEnRetard.size > 0) {
          alertes.push({
            icon: AlertTriangle,
            titre: "Retard de paiement",
            description: `${elevesEnRetard.size} élève(s) ont un paiement en retard.`,
          });
        }
      }
    }
  }

  const totalParClasse = new Map<string, number>();
  for (const e of elevesActifs) {
    const nom = e.classes?.nom_classe ?? "Sans classe";
    totalParClasse.set(nom, (totalParClasse.get(nom) ?? 0) + 1);
  }
  const donneesGraphique = Array.from(totalParClasse.entries()).map(([classe, total]) => ({ classe, total }));

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${nomAffiche}`}
        subtitle={
          anneeEnCours
            ? `Année scolaire ${anneeEnCours.libelle} — voici un résumé de l'activité de l'établissement.`
            : "Voici un résumé de l'activité de l'établissement."
        }
        decorativeIcon={GraduationCap}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={Users} label="Élèves actifs" value={elevesActifs.length} />
        {peutVoirKpiNonAJour && (
          <KpiCard
            icon={UserX}
            label={mois ? `Non à jour — ${mois}` : "Non à jour"}
            value={mois ? nonAJourCeMois : "—"}
            trend={variationNonAJour !== null ? { value: variationNonAJour, positive: variationNonAJour <= 0 } : undefined}
          />
        )}
        <KpiCard
          icon={UserPlus}
          label="Nouveaux élèves ce mois"
          value={nouveauxCeMois}
          trend={variationNouveaux !== null ? { value: variationNouveaux, positive: variationNouveaux >= 0 } : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {donneesGraphique.length > 0 && <DashboardChart data={donneesGraphique} />}
        </div>
        {peutVoirAlertePaiements && (
          <div>
            <AlertesPanel alertes={alertes} voirToutHref="/admin/paiements/en-retard" />
          </div>
        )}
      </div>
    </div>
  );
}
