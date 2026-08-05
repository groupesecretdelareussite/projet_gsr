import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { executerSuspensionAutomatique } from "@/lib/suspension-auto";

function secretValide(recu: string, attendu: string): boolean {
  const bufRecu = Buffer.from(recu);
  const bufAttendu = Buffer.from(attendu);
  return bufRecu.length === bufAttendu.length && timingSafeEqual(bufRecu, bufAttendu);
}

/**
 * §12.3 GSR_ARCHITECTURE.md — déclenchée par le cron Vercel (voir
 * `vercel.json`, `0 0 1 * *`) à minuit UTC le 1er de chaque mois. Aucune
 * session admin ici : l'authentification se fait par secret partagé
 * (`CRON_SECRET`), vérifié avant tout accès aux données — Vercel envoie ce
 * secret dans l'en-tête `Authorization` pour les cron jobs configurés.
 */
export async function GET(request: NextRequest) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!secretValide(authorization, `Bearer ${secretAttendu}`)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const resultat = await executerSuspensionAutomatique(new Date());

  return NextResponse.json({
    ok: true,
    moisVerifie: resultat.moisVerifie,
    anneeScolaireId: resultat.anneeScolaireId,
    nombreSuspendus: resultat.suspendus.length,
    suspendus: resultat.suspendus,
  });
}
