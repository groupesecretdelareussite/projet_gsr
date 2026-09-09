"use client";

import { useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  onStop,
  placeholder = "Posez une question à l'Agent IA (ex: 'Bilan des retards de Janvier', 'Notes de 3ème'…)",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajustement automatique de la hauteur du champ selon le contenu
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e as any);
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative flex items-end gap-2 bg-white rounded-2xl border border-gray-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition">
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1 max-h-28 resize-none bg-transparent px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-60"
      />

      {isLoading ? (
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          title="Arrêter la génération"
        >
          <Square className="w-4 h-4 fill-gray-700" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white bg-primary-gradient shadow-xs transition-all",
            input.trim()
              ? "opacity-100 hover:shadow-md cursor-pointer active:scale-95"
              : "opacity-40 cursor-not-allowed"
          )}
          title="Envoyer la question"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
