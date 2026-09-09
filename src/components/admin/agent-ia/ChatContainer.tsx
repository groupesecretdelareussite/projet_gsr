"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Sparkles, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { useUserScope } from "@/hooks/useUserScope";
import { ChatMessage, type MessageItem } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { PromptSuggestions } from "./PromptSuggestions";
import { ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

interface ChatContainerProps {
  initialPrompt?: string;
  isCompact?: boolean; // True quand affiché dans le Drawer/Widget flottant
}

export function ChatContainer({ initialPrompt, isCompact = false }: ChatContainerProps) {
  const scope = useUserScope();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleReset() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsLoading(false);
    toast.info("Nouvelle session de discussion démarrée.");
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      toast.info("Génération interrompue.");
    }
  }

  async function handleSend(questionText?: string) {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isLoading) return;

    setInput("");

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const assistantPlaceholderId = `assistant-${Date.now()}`;
    const assistantMessage: MessageItem = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      tools: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages([...newHistory, assistantMessage]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/admin/agent-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur (${res.status})`);
      }

      if (!res.body) {
        throw new Error("Flux de réponse vide.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const matchEvent = block.match(/^event:\s*(\w+)/m);
          const matchData = block.match(/^data:\s*(.*)$/m);

          const eventType = matchEvent ? matchEvent[1] : "message";
          const rawData = matchData ? matchData[1] : "";

          let parsedData: any = {};
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = { text: rawData };
          }

          if (eventType === "tool_call") {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantPlaceholderId) return msg;
                const tools = [...(msg.tools || [])];
                tools.push({
                  name: parsedData.name,
                  args: parsedData.args,
                  status: "running",
                });
                return { ...msg, tools };
              })
            );
          } else if (eventType === "tool_result") {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantPlaceholderId) return msg;
                const tools = (msg.tools || []).map((t) =>
                  t.name === parsedData.name ? { ...t, status: "done" as const, summary: parsedData.summary } : t
                );
                return { ...msg, tools };
              })
            );
          } else if (eventType === "text_chunk") {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantPlaceholderId) return msg;
                return { ...msg, content: msg.content + (parsedData.text || "") };
              })
            );
          } else if (eventType === "error") {
            toast.error(parsedData.message || "Erreur de traitement IA");
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantPlaceholderId) return msg;
                return {
                  ...msg,
                  content:
                    msg.content ||
                    `⚠️ **Erreur :** ${parsedData.message || "Une erreur est survenue lors de l'interrogation de l'IA."}`,
                };
              })
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Chat error:", err);
        toast.error(err.message || "Impossible de joindre l'agent IA.");
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantPlaceholderId) return msg;
            return {
              ...msg,
              content:
                msg.content ||
                `⚠️ **Erreur :** ${err.message || "Une interruption est survenue. Vérifiez la configuration de la clé d'API."}`,
            };
          })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Barre d'état supérieure */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">Agent IA GSR</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Lecture seule
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {ROLE_LABELS[scope.role]} · {scope.isGlobal ? "Tous les sites" : `${scope.siteIds.length} site(s) assigné(s)`}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleReset}
            type="button"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
            title="Effacer la conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Effacer</span>
          </button>
        )}
      </div>

      {/* Zone de conversation / Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-primary mb-4 shadow-sm">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Bonjour, {scope.username}
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Je suis l&apos;Agent IA du Groupe Secret de la Réussite. Je peux analyser vos
              recouvrements, vérifier la situation d&apos;un élève, synthétiser les présences ou préparer
              vos bilans de séance.
            </p>

            <div className="w-full">
              <PromptSuggestions role={scope.role} onSelect={(text) => handleSend(text)} />
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie inférieure */}
      <div className="p-3 bg-white border-t border-gray-200">
        {messages.length > 0 && (
          <div className="mb-2">
            <PromptSuggestions role={scope.role} onSelect={(text) => handleSend(text)} />
          </div>
        )}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          isLoading={isLoading}
          onStop={handleStop}
        />
        <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-gray-400">
          <span>Mode lecture seule — Zéro modification de données.</span>
          <span className="hidden sm:inline">Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  );
}
