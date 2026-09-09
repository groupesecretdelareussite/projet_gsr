import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { getGeminiClient, generateGsrContent, messageUtilisateurGemini, GSR_SYSTEM_INSTRUCTION } from "@/lib/ai/gemini";
import { GEMINI_TOOL_DECLARATIONS, executeToolCall } from "@/lib/ai/tools";

// Rôles explicitement autorisés (§ GSR_ARCHITECTURE.md)
const ROLES_AGENT_IA = ["coordonnateur", "comptable", "superviseur"];

export async function POST(request: NextRequest) {
  // 1. Authentification et contrôle de rôle
  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch (err: any) {
    return NextResponse.json({ error: "Session invalide ou non authentifiée." }, { status: 401 });
  }

  if (!ROLES_AGENT_IA.includes(scope.role)) {
    return NextResponse.json(
      { error: "Accès refusé. L'Agent IA est réservé au Coordonnateur, au Comptable et au Superviseur." },
      { status: 403 }
    );
  }

  // 2. Récupération des messages entrants
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Historique de messages vide." }, { status: 400 });
  }

  // 3. Initialisation du client Gemini
  let ai;
  try {
    ai = getGeminiClient();
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur d'initialisation de l'IA. Vérifiez GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  // 4. Construction du contexte spécifique à l'utilisateur connecté
  const roleContext = `
INFORMATIONS SUR L'UTILISATEUR CONNECTÉ :
- Nom d'utilisateur : ${scope.username}
- Rôle : ${scope.role}
- Périmètre géographique (Sites) : ${
    scope.isGlobal
      ? "Global (Tous les sites GSR)"
      : scope.siteIds.length > 0
      ? `Sites autorisés (IDs : ${scope.siteIds.join(", ")})`
      : "Aucun site assigné"
  }
- Consigne : Adapte strictement tes réponses au rôle et aux sites autorisés de ${scope.username}.
`;

  const systemInstruction = `${GSR_SYSTEM_INSTRUCTION}\n\n${roleContext}`;

  // Conversion de l'historique au format Gemini
  const contents: any[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Création du flux SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: any) {
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let maxToolSteps = 5; // Empêche toute boucle infinie
        let currentContents = [...contents];

        while (maxToolSteps > 0) {
          maxToolSteps--;

          const response = await generateGsrContent(ai, {
            contents: currentContents,
            systemInstruction,
            tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS as any }],
          });

          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Recherche d'appels d'outils
          const functionCalls = parts.filter((p: any) => p.functionCall);

          if (functionCalls.length > 0) {
            // Ajouter le tour du modèle aux contenus
            currentContents.push(candidate!.content);

            // Exécuter chaque outil et envoyer les événements SSE
            const toolResponseParts: any[] = [];
            for (const part of functionCalls) {
              const fc = (part as any).functionCall;
              sendEvent("tool_call", {
                name: fc.name,
                args: fc.args,
              });

              // Exécution sécurisée en lecture seule
              const result = await executeToolCall(fc.name, fc.args || {}, { supabase, scope });

              sendEvent("tool_result", {
                name: fc.name,
                summary: result?.error ? "Erreur d'accès" : "Données récupérées",
              });

              toolResponseParts.push({
                functionResponse: {
                  ...(fc.id ? { id: fc.id } : {}),
                  name: fc.name,
                  response: { result },
                },
              });
            }

            // Gemini n'accepte pas le rôle "tool" : les functionResponse
            // doivent être renvoyées avec le rôle "user".
            currentContents.push({
              role: "user",
              parts: toolResponseParts,
            });
          } else {
            // Pas d'appel d'outil, on diffuse le texte final
            const text = response.text || parts.map((p: any) => p.text || "").join("");
            if (text) {
              sendEvent("text_chunk", { text });
            }
            break;
          }
        }

        sendEvent("done", { status: "complete" });
        controller.close();
      } catch (err: any) {
        console.error("Erreur agent-ia route:", err);
        sendEvent("error", {
          message: messageUtilisateurGemini(err),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
