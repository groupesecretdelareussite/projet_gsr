import { Type } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserScope } from "@/lib/auth-scope";
import { siteInScope } from "@/lib/auth-scope";
import { MOIS_SCOLAIRES } from "@/lib/constants";

export interface ToolContext {
  supabase: SupabaseClient;
  scope: UserScope;
}

/**
 * Déclarations des outils (FunctionDeclarations) au format attendu par @google/genai
 */
export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "rechercher_eleves",
    description: "Recherche un ou plusieurs élèves par nom, prénom ou matricule dans le périmètre autorisé.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Nom, prénom ou matricule recherché (ex: 'KPADONOU', 'Paul', 'J1024').",
        },
        site_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer par identifiant de site physique.",
        },
        classe_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer par identifiant de classe.",
        },
        statut: {
          type: Type.STRING,
          description: "Optionnel: 'actif', 'suspendu' ou 'tous' (défaut: 'tous').",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_fiche_eleve",
    description: "Récupère le dossier complet d'un élève : classe, statut, historique des paiements, présences, moyennes et motif de suspension éventuel.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        eleve_id: {
          type: Type.INTEGER,
          description: "Identifiant numérique de l'élève.",
        },
        matricule: {
          type: Type.STRING,
          description: "Matricule de l'élève (ex: 'J10260012').",
        },
      },
    },
  },
  {
    name: "get_etat_paiements_et_recouvrement",
    description: "Fournit l'état des paiements et le taux de recouvrement pour un mois donné (ou global), avec le montant attendu vs collecté et la liste des retards.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        mois: {
          type: Type.STRING,
          description: "Mois scolaire concerné (ex: 'Octobre', 'Novembre', 'Decembre', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai').",
        },
        site_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer par identifiant de site.",
        },
        classe_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer par classe.",
        },
      },
    },
  },
  {
    name: "get_bilan_comptable",
    description: "Calcule la synthèse comptable globale : total des cotisations encaissées, total des dépenses annexes par catégorie, coût des séances TD et solde net. Réservé au Coordonnateur et Comptable.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        site_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer les recettes par site.",
        },
      },
    },
  },
  {
    name: "get_synthese_presences",
    description: "Analyse les présences et absences des élèves sur une période ou une classe, et liste les élèves avec absences répétées.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        site_id: {
          type: Type.INTEGER,
          description: "Optionnel: identifiant du site.",
        },
        classe_id: {
          type: Type.INTEGER,
          description: "Optionnel: identifiant de la classe.",
        },
        limit: {
          type: Type.INTEGER,
          description: "Nombre maximum d'élèves en alerte à renvoyer (défaut: 15).",
        },
      },
    },
  },
  {
    name: "get_performances_pedagogiques",
    description: "Fournit les moyennes et notes des élèves par classe ou matière, avec identification des élèves en difficulté ou en tête.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        classe_id: {
          type: Type.INTEGER,
          description: "Identifiant de la classe (recommandé).",
        },
        matiere_id: {
          type: Type.INTEGER,
          description: "Optionnel: identifiant de la matière.",
        },
        site_id: {
          type: Type.INTEGER,
          description: "Optionnel: filtrer par site.",
        },
      },
    },
  },
  {
    name: "get_planning_td",
    description: "Consulte les séances de TD hebdomadaires : créneaux ouverts, professeurs attribués et créneaux sans enseignant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        semaine_id: {
          type: Type.INTEGER,
          description: "Optionnel: identifiant de la semaine TD.",
        },
        statut_creneau: {
          type: Type.STRING,
          description: "Optionnel: 'brouillon', 'public', 'cloture'.",
        },
      },
    },
  },
  {
    name: "get_regles_metier_gsr",
    description: "Consulte la documentation officielle GSR sur les règles métier clés : suspensions, barèmes de frais TD, calculs de notes, règle d'arbitrage TD et cycle de fin d'année.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sujet: {
          type: Type.STRING,
          description: "Sujet de la règle : 'suspension', 'paiements', 'notes', 'td', 'fin_annee', 'roles'.",
        },
      },
      required: ["sujet"],
    },
  },
];

/**
 * Exécuteurs de requêtes en Lecture Seule avec contrôle de scope
 */
export async function executeToolCall(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<any> {
  const { supabase, scope } = ctx;

  try {
    switch (name) {
      case "rechercher_eleves": {
        const queryStr = String(args.query || "").trim();
        if (queryStr.length < 2) {
          return { error: "Le terme de recherche doit comporter au moins 2 caractères." };
        }

        let query = supabase
          .from("eleves")
          .select("id, matricule, nom, prenoms, college, statut, contact_parent, classes!inner(id, nom_classe, site_id, sites(id, nom_site))")
          .or(`nom.ilike.%${queryStr}%,prenoms.ilike.%${queryStr}%,matricule.ilike.%${queryStr}%`);

        if (args.statut && args.statut !== "tous") {
          query = query.eq("statut", args.statut);
        }

        if (args.classe_id) {
          query = query.eq("classe_id", args.classe_id);
        }

        // Restriction de scope pour superviseur
        if (scope.role === "superviseur") {
          if (scope.siteIds.length === 0) return { eleves: [], total: 0, message: "Aucun site assigné à votre profil." };
          query = query.in("classes.site_id", scope.siteIds);
        } else if (args.site_id) {
          query = query.eq("classes.site_id", args.site_id);
        }

        const { data, error } = await query.limit(25).order("nom");
        if (error) return { error: error.message };

        return {
          total: data?.length ?? 0,
          eleves: data?.map((e: any) => ({
            id: e.id,
            matricule: e.matricule,
            nom_complet: `${e.nom} ${e.prenoms}`,
            classe: e.classes?.nom_classe,
            site: e.classes?.sites?.nom_site,
            statut: e.statut,
            college: e.college,
            contact_parent: e.contact_parent,
            lien_admin: `/admin/eleves/${e.id}`,
          })),
        };
      }

      case "get_fiche_eleve": {
        let query = supabase
          .from("eleves")
          .select("id, matricule, nom, prenoms, contact_parent, college, option_m, statut, date_inscription, classes!inner(id, nom_classe, site_id, sites(id, nom_site), frais_td(montant))");

        if (args.eleve_id) {
          query = query.eq("id", args.eleve_id);
        } else if (args.matricule) {
          query = query.eq("matricule", String(args.matricule).trim());
        } else {
          return { error: "Veuillez préciser un eleve_id ou un matricule." };
        }

        const { data: eleve, error } = await query.maybeSingle();
        if (error || !eleve) return { error: "Élève introuvable." };

        const siteId = (eleve as any).classes?.site_id;
        if (siteId && !siteInScope(scope, siteId)) {
          return { error: "Accès refusé : cet élève appartient à un site en dehors de votre périmètre assigné." };
        }

        // 1. Paiements
        const { data: paiements } = await supabase
          .from("paiements")
          .select("mois_souscription, montant_paye, date_paiement, mode_paiement")
          .eq("eleve_id", eleve.id)
          .order("date_paiement", { ascending: false });

        // 2. Suspension si présent
        let suspension = null;
        if (eleve.statut === "suspendu") {
          const { data: suspData } = await supabase
            .from("eleves_suspendus")
            .select("raison, motif, montant_du, date_suspension")
            .eq("eleve_id", eleve.id)
            .maybeSingle();
          suspension = suspData;
        }

        // 3. Synthèse présences
        const { count: totalSeances } = await supabase
          .from("presences")
          .select("*", { count: "exact", head: true })
          .eq("eleve_id", eleve.id);

        const { count: absences } = await supabase
          .from("presences")
          .select("*", { count: "exact", head: true })
          .eq("eleve_id", eleve.id)
          .eq("present", false);

        // 4. Notes et moyennes récentes
        const { data: notes } = await supabase
          .from("notes")
          .select("type_note, valeur, matieres(nom, code)")
          .eq("eleve_id", eleve.id)
          .order("updated_at", { ascending: false })
          .limit(10);

        const moisPayes = (paiements || []).map((p) => p.mois_souscription);
        const moisImpayes = MOIS_SCOLAIRES.filter((m) => !moisPayes.includes(m));

        return {
          id: eleve.id,
          matricule: eleve.matricule,
          nom_complet: `${eleve.nom} ${eleve.prenoms}`,
          classe: (eleve as any).classes?.nom_classe,
          site: (eleve as any).classes?.sites?.nom_site,
          frais_mensuel_td: (eleve as any).classes?.frais_td?.[0]?.montant ?? 0,
          contact_parent: eleve.contact_parent,
          college: eleve.college,
          option: eleve.option_m,
          statut: eleve.statut,
          suspension,
          paiements: paiements || [],
          mois_a_jour: moisPayes,
          mois_restants_ou_en_retard: moisImpayes,
          presences: {
            total_seances: totalSeances ?? 0,
            absences: absences ?? 0,
            taux_presence: totalSeances ? Math.round((((totalSeances - (absences ?? 0)) / totalSeances) * 100)) : 100,
          },
          notes_recentes: notes || [],
          lien_admin: `/admin/eleves/${eleve.id}`,
        };
      }

      case "get_etat_paiements_et_recouvrement": {
        let siteFilter: number[] | null = null;
        if (scope.role === "superviseur") {
          siteFilter = scope.siteIds;
          if (siteFilter.length === 0) return { error: "Aucun site assigné." };
        } else if (args.site_id) {
          siteFilter = [args.site_id];
        }

        // Élèves actifs et leurs frais
        let elevesQuery = supabase
          .from("eleves")
          .select("id, matricule, nom, prenoms, contact_parent, classe_id, classes!inner(id, nom_classe, site_id, sites(nom_site), frais_td(montant))")
          .eq("statut", "actif");

        if (siteFilter) {
          elevesQuery = elevesQuery.in("classes.site_id", siteFilter);
        }
        if (args.classe_id) {
          elevesQuery = elevesQuery.eq("classe_id", args.classe_id);
        }

        const { data: elevesList, error: elError } = await elevesQuery;
        if (elError) return { error: elError.message };

        const totalEleves = elevesList?.length ?? 0;
        const eleveIds = (elevesList || []).map((e) => e.id);

        if (eleveIds.length === 0) {
          return { message: "Aucun élève trouvé pour ces critères.", total_eleves: 0 };
        }

        // Récupérer les paiements
        let pQuery = supabase
          .from("paiements")
          .select("eleve_id, mois_souscription, montant_paye")
          .in("eleve_id", eleveIds);

        if (args.mois) {
          pQuery = pQuery.eq("mois_souscription", args.mois);
        }

        const { data: paiementsList, error: pError } = await pQuery;
        if (pError) return { error: pError.message };

        const paiementsParEleve = new Map<number, string[]>();
        let montantTotalPerçu = 0;
        for (const p of paiementsList || []) {
          montantTotalPerçu += Number(p.montant_paye || 0);
          const current = paiementsParEleve.get(p.eleve_id) || [];
          current.push(p.mois_souscription);
          paiementsParEleve.set(p.eleve_id, current);
        }

        const moisVerif = args.mois || MOIS_SCOLAIRES[0]; // mois ciblé ou premier mois
        const elevesEnRetard: any[] = [];
        const elevesAJour: any[] = [];

        let montantTotalAttendu = 0;
        for (const el of elevesList || []) {
          const montantMois = Number((el as any).classes?.frais_td?.[0]?.montant || 0);
          montantTotalAttendu += montantMois;

          const moisPayes = paiementsParEleve.get(el.id) || [];
          if (moisPayes.includes(moisVerif)) {
            elevesAJour.push({ id: el.id, nom: `${el.nom} ${el.prenoms}`, classe: (el as any).classes?.nom_classe });
          } else {
            elevesEnRetard.push({
              id: el.id,
              matricule: el.matricule,
              nom: `${el.nom} ${el.prenoms}`,
              classe: (el as any).classes?.nom_classe,
              site: (el as any).classes?.sites?.nom_site,
              contact_parent: el.contact_parent,
              montant_du: montantMois,
            });
          }
        }

        const tauxRecouvrement = totalEleves > 0 ? Math.round((elevesAJour.length / totalEleves) * 100) : 0;

        return {
          mois_consulte: args.mois ?? "Global / Premier mois",
          total_eleves: totalEleves,
          nombre_a_jour: elevesAJour.length,
          nombre_en_retard: elevesEnRetard.length,
          taux_recouvrement_pourcent: tauxRecouvrement,
          montant_percu_fcfa: montantTotalPerçu,
          montant_attendu_fcfa: montantTotalAttendu,
          solde_restant_fcfa: Math.max(0, montantTotalAttendu - montantTotalPerçu),
          retards_principaux: elevesEnRetard.slice(0, 15),
        };
      }

      case "get_bilan_comptable": {
        if (!["coordonnateur", "comptable"].includes(scope.role)) {
          return { error: "Accès refusé. La synthèse comptable est réservée au Coordonnateur et au Comptable." };
        }

        // Recettes paiements
        const { data: paiements } = await supabase.from("paiements").select("montant_paye");
        const totalRecettes = (paiements || []).reduce((sum, p) => sum + Number(p.montant_paye || 0), 0);

        // Dépenses annexes
        const { data: depenses } = await supabase
          .from("depenses_annexes")
          .select("montant, categories_depenses(nom)");

        const depensesParCategorie: Record<string, number> = {};
        let totalDepenses = 0;
        for (const d of depenses || []) {
          const cat = (d as any).categories_depenses?.nom || "Autre";
          const m = Number(d.montant || 0);
          depensesParCategorie[cat] = (depensesParCategorie[cat] || 0) + m;
          totalDepenses += m;
        }

        // Coûts TD (budget prévu créneaux validés)
        const { data: creneauxTD } = await supabase
          .schema("td")
          .from("creneaux")
          .select("montant_prevu")
          .eq("statut_creneau", "cloture");

        const totalHonorairesTD = (creneauxTD || []).reduce((sum, c) => sum + Number(c.montant_prevu || 0), 0);

        const soldeNet = totalRecettes - (totalDepenses + totalHonorairesTD);

        return {
          total_recettes_eleves_fcfa: totalRecettes,
          total_depenses_annexes_fcfa: totalDepenses,
          depenses_par_categorie: depensesParCategorie,
          total_honoraires_td_prevus_fcfa: totalHonorairesTD,
          solde_net_fcfa: soldeNet,
          statut_financier: soldeNet >= 0 ? "Bénéficiaire" : "Déficitaire",
          lien_admin: "/admin/comptabilite",
        };
      }

      case "get_synthese_presences": {
        let pQuery = supabase
          .from("presences")
          .select("id, date_presence, present, eleves!inner(id, nom, prenoms, matricule, contact_parent, classes(nom_classe, site_id, sites(nom_site)))");

        if (scope.role === "superviseur") {
          if (scope.siteIds.length === 0) return { error: "Aucun site assigné." };
          pQuery = pQuery.in("eleves.classes.site_id", scope.siteIds);
        } else if (args.site_id) {
          pQuery = pQuery.eq("eleves.classes.site_id", args.site_id);
        }

        if (args.classe_id) {
          pQuery = pQuery.eq("eleves.classe_id", args.classe_id);
        }

        const { data, error } = await pQuery.order("date_presence", { ascending: false }).limit(200);
        if (error) return { error: error.message };

        const totalEnregistrements = data?.length ?? 0;
        const totalPresents = (data || []).filter((p) => p.present).length;
        const totalAbsents = totalEnregistrements - totalPresents;

        // Regrouper par élève pour détecter les absences répétées
        const absencesParEleve = new Map<number, { nom: string; matricule: string; count: number; contact: string }>();
        for (const p of data || []) {
          if (!p.present) {
            const el = p.eleves as any;
            const existing = absencesParEleve.get(el.id) || {
              nom: `${el.nom} ${el.prenoms}`,
              matricule: el.matricule,
              count: 0,
              contact: el.contact_parent,
            };
            existing.count += 1;
            absencesParEleve.set(el.id, existing);
          }
        }

        const elevesAbsentsCritiques = Array.from(absencesParEleve.values())
          .filter((e) => e.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, args.limit || 15);

        return {
          total_seances_enregistrees: totalEnregistrements,
          total_presents: totalPresents,
          total_absents: totalAbsents,
          taux_presence_pourcent: totalEnregistrements ? Math.round((totalPresents / totalEnregistrements) * 100) : 100,
          eleves_absences_repetees: elevesAbsentsCritiques,
          lien_admin: "/admin/presences",
        };
      }

      case "get_performances_pedagogiques": {
        let nQuery = supabase
          .from("notes")
          .select("valeur, type_note, eleves!inner(id, nom, prenoms, classe_id, classes!inner(nom_classe, site_id, sites(nom_site))), matieres!inner(nom, code)");

        if (scope.role === "superviseur") {
          if (scope.siteIds.length === 0) return { error: "Aucun site assigné." };
          nQuery = nQuery.in("eleves.classes.site_id", scope.siteIds);
        } else if (args.site_id) {
          nQuery = nQuery.in("eleves.classes.site_id", [args.site_id]);
        }

        if (args.classe_id) {
          nQuery = nQuery.eq("eleves.classe_id", args.classe_id);
        }
        if (args.matiere_id) {
          nQuery = nQuery.eq("matiere_id", args.matiere_id);
        }

        const { data, error } = await nQuery.limit(250);
        if (error) return { error: error.message };

        if (!data || data.length === 0) {
          return { message: "Aucune note enregistrée pour ces critères." };
        }

        const notesValues = data.map((n) => Number(n.valeur));
        const moyenneGlobale = notesValues.reduce((a, b) => a + b, 0) / notesValues.length;

        const elevesEnDifficulte = data
          .filter((n) => Number(n.valeur) < 10)
          .slice(0, 10)
          .map((n: any) => ({
            nom: `${n.eleves?.nom} ${n.eleves?.prenoms}`,
            classe: n.eleves?.classes?.nom_classe,
            matiere: n.matieres?.nom,
            note: Number(n.valeur),
            type: n.type_note,
          }));

        return {
          total_notes_evaluees: data.length,
          moyenne_generale_sur_20: Math.round(moyenneGlobale * 100) / 100,
          meilleure_note: Math.max(...notesValues),
          note_la_plus_basse: Math.min(...notesValues),
          echantillon_notes_sous_la_moyenne: elevesEnDifficulte,
          lien_admin: "/admin/notes",
        };
      }

      case "get_planning_td": {
        const { data: semaines } = await supabase
          .schema("td")
          .from("semaines")
          .select("id, libelle, date_debut, date_fin, statut")
          .order("date_debut", { ascending: false })
          .limit(3);

        const semaineCible = args.semaine_id || semaines?.[0]?.id;

        let cQuery = supabase
          .schema("td")
          .from("creneaux")
          .select("id, date_td, heure_debut, heure_fin, montant_prevu, statut_creneau, matieres_td(nom_matiere), classes:classe_id(nom_classe, sites(nom_site)), postulations(id, statut_validation, professeurs(nom, prenom, telephone))")
          .eq("semaine_id", semaineCible);

        if (args.statut_creneau) {
          cQuery = cQuery.eq("statut_creneau", args.statut_creneau);
        }

        const { data: creneaux, error } = await cQuery;
        if (error) return { error: error.message };

        const creneauxFormatted = (creneaux || []).map((c: any) => {
          const postulationValidee = (c.postulations || []).find((p: any) => p.statut_validation === "Valide");
          return {
            id: c.id,
            date: c.date_td,
            horaire: `${c.heure_debut} - ${c.heure_fin}`,
            matiere: c.matieres_td?.nom_matiere,
            classe: c.classes?.nom_classe,
            site: c.classes?.sites?.nom_site,
            professeur_attribue: postulationValidee ? `${postulationValidee.professeurs?.nom} ${postulationValidee.professeurs?.prenom}` : "AUCUN (En attente)",
            candidatures_en_attente: (c.postulations || []).filter((p: any) => p.statut_validation === "En attente").length,
          };
        });

        const nonPourvus = creneauxFormatted.filter((c) => c.professeur_attribue.startsWith("AUCUN"));

        return {
          semaine: semaines?.find((s) => s.id === semaineCible) || "Semaine en cours",
          total_creneaux: creneauxFormatted.length,
          creneaux_non_attribues: nonPourvus.length,
          liste_creneaux: creneauxFormatted,
          lien_admin: "/td/coord/dashboard",
        };
      }

      case "get_regles_metier_gsr": {
        const sujet = String(args.sujet || "").toLowerCase();
        const doc: Record<string, string> = {
          suspension: "Suspension : La suspension automatique s'applique pour défaut de paiement non régularisé. Les élèves suspendus conservent leur historique (notes, paiements, présences). Le montant dû correspond aux frais mensuels de la classe. La réinscription s'effectue après régularisation du paiement.",
          paiements: "Paiements : Mois de souscription d'Octobre à Mai (8 mois). Modes autorisés : MoMo ou Présentiel. Tout paiement est manuel et génère une quittance. Les suppressions de paiement sont consignées dans 'paiements_supprimes' avec motif obligatoire.",
          notes: "Notes : Système dynamique sur 20 points. Types autorisés : I1, I2, I3 (Interrogations), D1, D2 (Devoirs), Ctrl (Contrôles). Coefficients par matière et par classe paramétrables.",
          td: "TD & Arbitrage : Séances hebdomadaires créées par semaine (brouillon -> publiée -> clôturée). Règle A : Aucun chevauchement d'horaire pour un professeur sur une même date. Candidatures validées ou refusées par le coordonnateur.",
          fin_annee: "Fin d'année : Décisions de passage : 'passe', 'redouble' ou 'sortant'. Calcul automatique de la classe suivante par site. Si aucune classe suivante sur le site, statut 'sortant'. Les élèves sortants sont purgés en fin de session.",
          roles: "Rôles : Coordonnateur (accès total), Comptable (accès financier et scolaire, pas de configuration système), Superviseur (accès limité à ses sites assignés dans user_sites), Chef de site (consultation et saisie locale de présence/notes), Secrétaire (droits minimaux).",
        };
        return {
          sujet,
          explication: doc[sujet] || "Sujet non spécifique. Consultez GSR_ARCHITECTURE.md pour la documentation exhaustive.",
        };
      }

      default:
        return { error: `Outil inconnu : ${name}` };
    }
  } catch (err: any) {
    return { error: `Erreur d'exécution de l'outil ${name}: ${err?.message || String(err)}` };
  }
}
