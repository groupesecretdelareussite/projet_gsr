import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { getOrdreNiveau } from "@/lib/programmes-tri";
import {
  ProgrammeHebdoStaffPDF,
  type ProgrammeHebdoDataPDF,
  type JourProgrammePDF,
  type LigneCreneauPDF,
} from "@/components/td/ProgrammeHebdoStaffPDF";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Contrôle d'authentification et de rôle (sécurité absolue)
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    return new NextResponse("Non authentifié : veuillez vous connecter.", { status: 401 });
  }

  const rolesAutorises = ["chef_site", "coordonnateur", "superviseur"];
  if (!rolesAutorises.includes(scope.role)) {
    return new NextResponse("Accès refusé : réservé aux membres du personnel staff autorisés.", {
      status: 403,
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedSiteId = searchParams.get("site") ? Number(searchParams.get("site")) : null;

  // 2. Détermination stricte du site (parade anti-IDOR/BOLA)
  let targetSiteId: number | null = null;
  if (scope.role === "chef_site") {
    if (!scope.siteId) {
      return new NextResponse("Erreur de configuration : aucun site associé à votre compte.", {
        status: 400,
      });
    }
    // Le chef de site ne peut JAMAIS surcharger son site par l'URL
    targetSiteId = scope.siteId;
  } else if (scope.role === "superviseur") {
    if (requestedSiteId && scope.siteIds.includes(requestedSiteId)) {
      targetSiteId = requestedSiteId;
    } else {
      targetSiteId = scope.siteIds[0] ?? null;
    }
  } else if (scope.role === "coordonnateur") {
    targetSiteId = requestedSiteId ?? null;
  }

  const supabaseAdmin = createServiceRoleClient();

  // 3. Récupération de la semaine publiée
  const requestedSemaineId = searchParams.get("semaine") ? Number(searchParams.get("semaine")) : null;
  let semaineQuery = supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("id, libelle, date_debut, date_fin")
    .eq("statut", "publiee");

  if (requestedSemaineId) {
    semaineQuery = semaineQuery.eq("id", requestedSemaineId);
  } else {
    semaineQuery = semaineQuery.order("date_debut", { ascending: false }).limit(1);
  }

  const { data: semaineData } = await semaineQuery.maybeSingle();

  // 4. Récupération des sites, classes et matières
  let classesQuery = supabaseAdmin.from("classes").select("id, nom_classe, site_id, ordre");
  if (targetSiteId) {
    classesQuery = classesQuery.eq("site_id", targetSiteId);
  }
  const [{ data: classes }, { data: sites }, { data: matieres }] = await Promise.all([
    classesQuery,
    supabaseAdmin.from("sites").select("id, nom_site"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
  ]);

  const listeClasses = classes ?? [];
  const classeIds = listeClasses.map((c) => c.id);
  const classesMap = new Map(listeClasses.map((c) => [c.id, c]));
  const sitesMap = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const matieresMap = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));

  const nomSiteAffiche = targetSiteId
    ? sitesMap.get(targetSiteId) ?? `Site #${targetSiteId}`
    : "Tous les sites";

  // 5. Récupération des créneaux de cette semaine (ouverts ou clôturés avec prof)
  let creneaux: {
    id: number;
    classe_id: number;
    matiere_id: number;
    date_td: string;
    heure_debut: string;
    heure_fin: string;
  }[] = [];

  if (semaineData && classeIds.length > 0) {
    const { data: creneauxData } = await supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin")
      .eq("semaine_id", semaineData.id)
      .in("statut_creneau", ["public", "cloture"])
      .in("classe_id", classeIds)
      .order("date_td")
      .order("heure_debut");
    creneaux = creneauxData ?? [];
  }

  const creneauIds = creneaux.map((c) => c.id);

  // 6. Récupération des professeurs affectés et validés
  const profIdParCreneauId = new Map<number, number>();
  if (creneauIds.length > 0) {
    const { data: postulations } = await supabaseAdmin
      .schema("td")
      .from("postulations")
      .select("creneau_id, professeur_id")
      .in("creneau_id", creneauIds)
      .eq("statut_validation", "Valide");

    for (const p of postulations ?? []) {
      profIdParCreneauId.set(p.creneau_id, p.professeur_id);
    }
  }

  const profIds = Array.from(new Set(profIdParCreneauId.values()));
  const profMap = new Map<number, { nom: string; prenom: string; telephone: string }>();
  if (profIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("id, nom, prenom, telephone")
      .in("id", profIds);

    for (const p of profs ?? []) {
      profMap.set(p.id, p);
    }
  }

  // 7. Groupement par jour et tri strict par classe (6ème → Terminale)
  const parJourMap = new Map<string, LigneCreneauPDF[]>();

  for (const c of creneaux) {
    const metaClasse = classesMap.get(c.classe_id);
    const nomClasse = metaClasse?.nom_classe ?? `Classe #${c.classe_id}`;
    const nomMatiere = matieresMap.get(c.matiere_id) ?? "—";
    const profId = profIdParCreneauId.get(c.id);
    const prof = profId ? profMap.get(profId) : null;

    const profTexte = prof
      ? `${prof.nom.toUpperCase()} ${prof.prenom}${prof.telephone ? ` · ${prof.telephone}` : ""}`
      : "Non attribué";

    const ligne: LigneCreneauPDF = {
      id: c.id,
      heure: `${c.heure_debut.slice(0, 5)} – ${c.heure_fin.slice(0, 5)}`,
      classe: nomClasse,
      matiere: nomMatiere,
      professeur: profTexte,
      ordreNiveau: getOrdreNiveau(nomClasse, metaClasse?.ordre),
    };

    const existants = parJourMap.get(c.date_td) ?? [];
    existants.push(ligne);
    parJourMap.set(c.date_td, existants);
  }

  const joursDates = Array.from(parJourMap.keys()).sort();
  const jours: JourProgrammePDF[] = [];

  for (const dateIso of joursDates) {
    const creneauxJour = parJourMap.get(dateIso) ?? [];

    // Tri strict selon les 2 critères :
    // 1. Ordre de niveau (6ème → Terminale)
    // 2. Nom alphabétique de la classe
    // 3. Heure au sein de la classe
    creneauxJour.sort((a, b) => {
      if (a.ordreNiveau !== b.ordreNiveau) {
        return a.ordreNiveau - b.ordreNiveau;
      }
      const cmpNom = a.classe.localeCompare(b.classe, "fr", { sensitivity: "base", numeric: true });
      if (cmpNom !== 0) return cmpNom;
      return a.heure.localeCompare(b.heure);
    });

    const dateFormatee = new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    jours.push({
      dateIso,
      dateFormatee: dateFormatee.charAt(0).toUpperCase() + dateFormatee.slice(1),
      creneaux: creneauxJour,
    });
  }

  const now = new Date();
  const dateGen = `${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const libelleSemaine = semaineData?.libelle ?? "Semaine_non_publiee";
  const dateDebut = semaineData?.date_debut ?? "";
  const dateFin = semaineData?.date_fin ?? "";

  const dataPdf: ProgrammeHebdoDataPDF = {
    nomSite: nomSiteAffiche,
    libelleSemaine,
    dateDebut,
    dateFin,
    dateGeneration: dateGen,
    nomUtilisateur: scope.username,
    roleUtilisateur: scope.role,
    jours,
  };

  // 8. Génération du flux PDF
  const docElement = React.createElement(ProgrammeHebdoStaffPDF, {
    data: dataPdf,
  }) as unknown as Parameters<typeof renderToStream>[0];
  const stream = await renderToStream(docElement);

  const slugSite = nomSiteAffiche
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_");
  const nomFichier = `Programme_TD_${slugSite}_${libelleSemaine.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
