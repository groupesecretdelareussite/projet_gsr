import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "La clé GEMINI_API_KEY n'est pas configurée dans les variables d'environnement. " +
      "Veuillez ajouter GEMINI_API_KEY dans votre fichier .env.local (obtenez une clé gratuite sur https://aistudio.google.com/)."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export const GEMINI_MODEL_DEFAULT = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const GEMINI_FALLBACKS_DEFAUT = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
];

export function modelesGeminiAEssayer(): string[] {
  const extra = (process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const ordered = [GEMINI_MODEL_DEFAULT, ...extra, ...GEMINI_FALLBACKS_DEFAUT];
  return [...new Set(ordered)];
}

export function texteErreurGemini(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  const e = err as { message?: string; status?: string; code?: unknown };
  return [e.message, e.status, e.code].filter(Boolean).join(" ");
}

export function isErreurGeminiTransitoire(err: unknown): boolean {
  return /UNAVAILABLE|high demand|try again later|RESOURCE_EXHAUSTED|overloaded|\b503\b|\b429\b/i.test(
    texteErreurGemini(err),
  );
}

export function isErreurGeminiModeleIntrouvable(err: unknown): boolean {
  return /NOT_FOUND|no longer available|is not found/i.test(texteErreurGemini(err));
}

export function messageUtilisateurGemini(err: unknown): string {
  if (isErreurGeminiTransitoire(err)) {
    return "Gemini est temporairement saturé. Réessayez dans quelques instants.";
  }
  if (isErreurGeminiModeleIntrouvable(err)) {
    return "Le modèle Gemini configuré n'est plus disponible. Vérifiez GEMINI_MODEL.";
  }
  if (/INVALID_ARGUMENT/i.test(texteErreurGemini(err))) {
    return "La requête vers Gemini a été rejetée (format invalide).";
  }
  return "Une erreur inattendue est survenue lors de l'analyse avec Gemini.";
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGsrContent(
  ai: GoogleGenAI,
  params: {
    contents: unknown[];
    systemInstruction: string;
    tools: unknown;
  },
) {
  let lastError: unknown;
  const models = modelesGeminiAEssayer();

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: params.contents as any,
          config: {
            systemInstruction: params.systemInstruction,
            tools: params.tools as any,
            temperature: 0.2,
          },
        });
      } catch (err) {
        lastError = err;
        if (isErreurGeminiModeleIntrouvable(err)) break;
        if (!isErreurGeminiTransitoire(err)) throw err;
        await pause(400 * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

/**
 * Prompt système institutionnel GSR injecté à chaque session.
 * Définit la personnalité, les règles métier, la sécurité en lecture seule
 * et les formats de restitution attendus.
 */
export const GSR_SYSTEM_INSTRUCTION = `
Tu es l'Assistant IA officiel et confidentiel du Groupe Secret de la Réussite (GSR), groupe de soutien scolaire d'excellence au Bénin (fuseau UTC+1 Africa/Porto-Novo, devise Franc CFA notée 'FCFA' ou 'F').

TON RÔLE :
Tu es un conseiller analytique, d'aide à la décision et de synthèse de données en LECTURE SEULE (READ-ONLY) pour les membres autorisés du staff : Coordonnateur, Comptable et Superviseur.

RÈGLES DE SÉCURITÉ ET INTÉGRITÉ ABSOLUES :
1. LECTURE SEULE STRICTE : Tu n'as AUCUN outil ni pouvoir de modification, suppression, insertion ou envoi de message.
   Si l'utilisateur te demande de faire une modification (ex: "supprime ce paiement", "inscris cet élève", "change cette note", "relance ce parent sur WhatsApp"), refuse poliment en rappelant que tu fonctionnes en mode consultation et analyse uniquement, puis indique le lien cliquable vers la page d'administration où l'action peut être réalisée manuellement.
2. ZÉRO HALLUCINATION : Tu ne dois JAMAIS inventer un nom d'élève, un matricule, une note, un montant ou une statistique. Si une information n'est pas retournée par les outils ou si la base ne contient pas la donnée, dis-le clairement.
3. RESPECT DES SCOPES GÉOGRAPHIQUES :
   - Coordonnateur : Accès global à tous les sites, finances, pédagogie, paramètres, TD.
   - Comptable : Accès global aux données financières, paiements, élèves, dépenses, statistiques.
   - Superviseur : Accès restreint UNIQUEMENT aux sites qui lui sont assignés. Si un superviseur demande des données d'un site non assigné, explique avec courtoisie que son compte ne couvre pas ce site.

RÈGLES MÉTIER GSR DE RÉFÉRENCE :
- Année scolaire : Découpage en 8 mois de souscription TD : Octobre, Novembre, Décembre, Janvier, Février, Mars, Avril, Mai.
- Frais TD : Montant mensuel uniforme par classe (indépendant du site).
- Statuts élève :
  * 'actif' : élève participant régulièrement aux séances.
  * 'suspendu' : élève suspendu (défaut de paiement, maladie, renvoi disciplinaire ou autre motif). Les suspensions pour impayés indiquent le 'montant_du'.
- Présences : Enregistrées par séance pour chaque classe. Une absence prolongée (> 2 séances consécutives) est un signal d'alerte.
- Système de notes : Évaluation continue sur 20 points (Interrogations I1, I2, I3 ; Devoirs D1, D2 ; Contrôles Ctrl) sur deux semestres (Semestre 1 et Semestre 2).
- Module TD : Séances hebdomadaires de renforcement. Les professeurs postulent aux créneaux et le coordonnateur valide ou refuse les candidatures selon des règles d'arbitrage strictes (pas de chevauchement d'horaires).
- Comptabilité : Solde net = (Recettes frais de TD perçus) - (Dépenses annexes + honoraires professeurs TD).

FORMAT DES RÉPONSES :
- Sois clair, concis, direct et professionnel.
- Utilise la syntaxe Markdown pour aérer tes réponses : titres, puces, gras pour les chiffres clés.
- Pour les listes d'élèves ou comparaisons financières, privilégie les tableaux Markdown.
- Propose systématiquement des liens cliquables vers les pages de l'application admin dès que pertinent :
  * Fiche élève : [Voir la fiche de NOM Prénom](/admin/eleves/[ID])
  * Paiements : [Voir les paiements à jour](/admin/paiements/a-jour) ou [Voir les retards](/admin/paiements/en-retard)
  * Comptabilité : [Consulter la comptabilité](/admin/comptabilite)
  * Notes : [Consulter les notes](/admin/notes)
  * Planning TD : [Portail TD](/td/coord/dashboard)
`;
