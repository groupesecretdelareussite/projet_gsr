import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope } from "@/lib/auth-scope";
import { resteAPayer, genererNumeroQuittance } from "@/lib/paiements";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";
import { QuittancePDF, type QuittanceData } from "@/components/admin/paiements/QuittancePDF";

export const dynamic = "force-dynamic";

const ROLES_AUTORISES = ["coordonnateur", "comptable", "superviseur"];

// Normalisation des mois pour accepter par exemple "octobre" ou "Octobre"
function normaliserMois(moisInput: string): MoisScolaire | null {
  const clean = moisInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const moisTrouve = MOIS_SCOLAIRES.find(
    (m) => m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === clean
  );
  return moisTrouve ?? null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Contrôle d'authentification et de rôle (sécurité absolue)
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    return new NextResponse("Non authentifié : veuillez vous connecter.", { status: 401 });
  }

  if (!ROLES_AUTORISES.includes(scope.role)) {
    return new NextResponse("Accès refusé : rôle non autorisé pour les quittances.", {
      status: 403,
    });
  }

  // 2. Validation stricte des paramètres de requête
  const searchParams = request.nextUrl.searchParams;
  const rawEleveId = searchParams.get("eleveId");
  const rawMois = searchParams.get("mois");

  const eleveId = Number(rawEleveId);
  if (!rawEleveId || isNaN(eleveId) || eleveId <= 0) {
    return new NextResponse("Paramètre eleveId manquant ou invalide.", { status: 400 });
  }

  if (!rawMois) {
    return new NextResponse("Paramètre mois manquant.", { status: 400 });
  }

  const mois = normaliserMois(rawMois);
  if (!mois) {
    return new NextResponse(
      `Mois invalide (${rawMois}). Mois attendus : ${MOIS_SCOLAIRES.join(", ")}.`,
      { status: 400 }
    );
  }

  const supabaseAdmin = createServiceRoleClient();

  // 3. Récupération de l'élève et parade anti-IDOR/BOLA (périmètre de site)
  const { data: eleve, error: errEleve } = await supabaseAdmin
    .from("eleves")
    .select("id, matricule, nom, prenoms, college, classe_id, classes(nom_classe, site_id, sites(nom_site))")
    .eq("id", eleveId)
    .maybeSingle();

  if (errEleve || !eleve) {
    return new NextResponse("Élève introuvable.", { status: 404 });
  }

  type ClassesJoin = {
    nom_classe: string;
    site_id: number;
    sites: { nom_site: string } | null;
  } | null;

  const classesData = eleve.classes as unknown as ClassesJoin;
  const siteId = classesData?.site_id;

  if (siteId && !siteInScope(scope, siteId)) {
    return new NextResponse("Accès refusé : cet élève n'appartient pas à votre périmètre de site.", {
      status: 403,
    });
  }

  // 4. Récupération de l'année scolaire en cours
  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id, libelle")
    .eq("statut", "en_cours")
    .maybeSingle();

  if (!anneeEnCours) {
    return new NextResponse("Aucune année scolaire en cours active.", { status: 400 });
  }

  // 5. Récupération des frais TD de la classe
  const { data: fraisTd } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .maybeSingle();

  if (!fraisTd) {
    return new NextResponse("Montant de frais TD non configuré pour la classe de cet élève.", {
      status: 400,
    });
  }

  const montantAttendu = Number(fraisTd.montant);

  // 6. Récupération des versements du mois
  const { data: paiementsData } = await supabaseAdmin
    .from("paiements")
    .select("id, montant_paye, date_paiement, mode_paiement")
    .eq("eleve_id", eleveId)
    .eq("mois_souscription", mois)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .order("date_paiement", { ascending: true })
    .order("id", { ascending: true });

  const paiements = paiementsData ?? [];
  const reste = resteAPayer(
    montantAttendu,
    paiements.map((p) => ({ montant_paye: Number(p.montant_paye) }))
  );

  // 7. Règle absolue du mois soldé (§8.7/§12.5) : Aucun reçu pour un mois non soldé
  if (reste > 0) {
    return new NextResponse(
      `Impossible de délivrer la quittance : le mois de ${mois} n'est pas intégralement soldé (reste dû : ${reste} F).`,
      { status: 400 }
    );
  }

  // 8. Préparation des données du PDF
  const anneeLibelle = anneeEnCours.libelle ?? "2025-2026";
  const lastId = paiements[paiements.length - 1]?.id ?? 1;
  const numeroQuittance = genererNumeroQuittance(anneeLibelle, mois, lastId);

  const quittanceData: QuittanceData = {
    eleveId,
    numeroQuittance,
    nomComplet: `${eleve.nom} ${eleve.prenoms}`,
    matricule: eleve.matricule,
    college: eleve.college ?? "",
    nomClasse: classesData?.nom_classe ?? "—",
    nomSite: classesData?.sites?.nom_site ?? "—",
    mois,
    anneeScolaire: anneeLibelle,
    montantAttendu,
    versements: paiements.map((p) => ({
      id: p.id,
      datePaiement: p.date_paiement,
      montantPaye: Number(p.montant_paye),
      modePaiement: p.mode_paiement,
    })),
  };

  // 9. Rendu du flux PDF côté serveur (Node.js)
  const docElement = React.createElement(QuittancePDF, {
    data: quittanceData,
  }) as unknown as Parameters<typeof renderToStream>[0];

  const stream = await renderToStream(docElement);
  const nomFichier = `Quittance_${eleve.matricule}_${mois}.pdf`;

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
