"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User, Copy, Check } from "lucide-react";
import { ToolCallBadge, type ToolCallItem } from "./ToolCallBadge";
import { cn } from "@/lib/utils";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: ToolCallItem[];
  timestamp?: string;
}

export function ChatMessage({ message }: { message: MessageItem }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "flex gap-3 my-3 text-sm transition-all",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
          isUser
            ? "bg-gray-800 text-white"
            : "bg-primary-gradient text-white"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Bulle de message */}
      <div
        className={cn(
          "max-w-[88%] md:max-w-[80%] rounded-2xl p-4 shadow-sm border",
          isUser
            ? "bg-emerald-700 text-white rounded-tr-none border-emerald-800"
            : "bg-white text-gray-800 rounded-tl-none border-gray-100"
        )}
      >
        {/* Badges d'outils appelés (pour l'assistant) */}
        {!isUser && message.tools && message.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-gray-100">
            {message.tools.map((t, idx) => (
              <ToolCallBadge key={idx} tool={t} />
            ))}
          </div>
        )}

        {/* Contenu Markdown */}
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-800 space-y-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith("/")) {
                    return (
                      <Link
                        href={href}
                        className="inline-flex items-center text-primary font-semibold underline decoration-primary/40 hover:decoration-primary transition"
                      >
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold underline"
                    >
                      {children}
                    </a>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-emerald-50/80 font-semibold text-emerald-950 uppercase tracking-wider">
                    {children}
                  </thead>
                ),
                th: ({ children }) => <th className="px-3 py-2 text-xs">{children}</th>,
                td: ({ children }) => (
                  <td className="px-3 py-2 whitespace-nowrap border-t border-gray-100">{children}</td>
                ),
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-1">{children}</ol>,
                p: ({ children }) => <p className="leading-relaxed my-1.5">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Pied de bulle : bouton copier & timestamp */}
        {!isUser && message.content && (
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50 text-[11px] text-gray-400">
            <span>Assistant IA GSR</span>
            <button
              onClick={handleCopy}
              className="hover:text-gray-600 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-50"
              title="Copier la réponse"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
