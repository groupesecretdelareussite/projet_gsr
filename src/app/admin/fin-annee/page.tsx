import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DemarrerRevueButton } from "@/components/admin/fin-annee/DemarrerRevueButton";
import { RevueFinAnnee, type GroupeClasse, type DecisionExistante, type EleveSuspenduRef } from "@/components/admin/fin-annee/RevueFinAnnee";
import type { ClasseOption } from "@/components/admin/parametres/NouvelleClasseDialog";

interface AnneeRow {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: "en_cours" | "en_pause" | "terminee";
}

interface EleveActifRow {
  id: number;
  nom: string;
  prenoms: string;
  matricule: string;
  classe_id: number;
  classes: { nom_classe: string; ordre: number; classe_suivante_id: number | null; site_id: number; sites: { nom_site: string } | null } | null;
}

export default async function FinAnneePage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Fin d'année" />
        <EmptyState icon={GraduationCap} title="Non autorisé" description="Cette page est réservée au coordonnateur." />
      </div>
    );
  }

  const header = <PageHeader title="Fin d'année" subtitle="Passage à l'année scolaire suivante" />;

  const { data: annees } = await supabase
    .from("annees_scolaires")
    .select("id, libelle, date_debut, date_fin, statut")
    .order("date_debut", { ascending: false });
  const anneesList = (annees ?? []) as AnneeRow[];
  const anneeEnCours = anneesList.find((a) => a.statut === "en_cours");
  const anneeEnPause = anneesList.find((a) => a.statut === "en_pause");

  if (!anneeEnCours && !anneeEnPause) {
    return (
      <div>
        {header}
        <EmptyState
          icon={GraduationCap}
          title="Aucune année scolaire active"
          description="Aucune année en_cours ou en_pause — vérifier la configuration dans Paramètres > Données scolaires."
        />
      </div>
    );
  }

  if (!anneeEnPause) {
    return (
      <div>
        {header}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Année en cours : {anneeEnCours!.libelle}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Démarrer la revue de fin d&apos;année met l&apos;année <strong>{anneeEnCours!.libelle}</strong> en pause et
            prépare la liste des passages de classe. Les élèves dont la classe a une classe suivante définie sont
            proposés en « Passe » par défaut (modifiable). Les élèves en point de décision (ex. choix de série, ou fin
            de chaîne sur un site) devront être traités un par un avant de pouvoir valider. Rien n&apos;est définitif
            tant que la validation finale n&apos;a pas été confirmée — la revue peut être annulée à tout moment.
          </p>
          <DemarrerRevueButton />
        </div>
      </div>
    );
  }

  const [{ data: elevesData }, { data: decisionsData }, { data: classesData }, { data: suspendusData }] = await Promise.all([
    supabase
      .from("eleves")
      .select("id, nom, prenoms, matricule, classe_id, classes(nom_classe, ordre, classe_suivante_id, site_id, sites(nom_site))")
      .eq("statut", "actif")
      .order("nom"),
    supabase.from("decisions_passage").select("eleve_id, decision, nouvelle_classe_id"),
    supabase.from("classes").select("id, nom_classe, site_id, sites(nom_site)").order("site_id").order("ordre"),
    supabase.from("eleves").select("id, nom, prenoms, matricule").eq("statut", "suspendu").order("nom"),
  ]);

  const elevesActifs = (elevesData ?? []) as unknown as EleveActifRow[];
  const decisionsExistantes = (decisionsData ?? []) as DecisionExistante[];
  const classesOptions = ((classesData ?? []) as unknown as { id: number; nom_classe: string; sites: { nom_site: string } | null }[]).map(
    (c) => ({ id: c.id, nom_classe: c.nom_classe, nom_site: c.sites?.nom_site ?? "—" })
  ) as ClasseOption[];
  const elevesSuspendus = (suspendusData ?? []) as EleveSuspenduRef[];

  const groupesMap = new Map<number, GroupeClasse>();
  for (const e of elevesActifs) {
    if (!e.classes) continue;
    if (!groupesMap.has(e.classe_id)) {
      groupesMap.set(e.classe_id, {
        classeId: e.classe_id,
        nomClasse: e.classes.nom_classe,
        nomSite: e.classes.sites?.nom_site ?? "—",
        ordre: e.classes.ordre,
        classeSuivanteId: e.classes.classe_suivante_id,
        eleves: [],
      });
    }
    groupesMap.get(e.classe_id)!.eleves.push({ id: e.id, nom: e.nom, prenoms: e.prenoms, matricule: e.matricule });
  }
  const groupes = Array.from(groupesMap.values()).sort((a, b) => a.nomSite.localeCompare(b.nomSite) || a.ordre - b.ordre);

  return (
    <div>
      {header}
      <RevueFinAnnee
        groupes={groupes}
        decisionsExistantes={decisionsExistantes}
        classesOptions={classesOptions}
        elevesSuspendus={elevesSuspendus}
        totalActifs={elevesActifs.length}
        anneeEnPause={{ libelle: anneeEnPause.libelle, dateFin: anneeEnPause.date_fin }}
      />
    </div>
  );
}
