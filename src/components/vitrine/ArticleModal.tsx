"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Article } from "@/lib/actualites";
import { CATEGORY_STYLES } from "@/lib/actualites";

interface ArticleModalProps {
  article: Article | null;
  onOpenChange: (open: boolean) => void;
}

/** Popup de lecture d'article — carrousel d'images en tête (fixe), corps défilant, bouton fermer toujours accessible (hérité de DialogContent, jamais emporté par le scroll). */
export function ArticleModal({ article, onOpenChange }: ArticleModalProps) {
  const [indexImage, setIndexImage] = useState(0);

  useEffect(() => {
    setIndexImage(0);
  }, [article?.id]);

  return (
    <Dialog open={article !== null} onOpenChange={onOpenChange}>
      {article && (
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] flex flex-col gap-0 p-0">
          <div className="relative h-56 sm:h-72 shrink-0 bg-gray-100">
            <Image src={article.images[indexImage]} alt={article.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span
              className={`absolute top-4 left-4 inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${CATEGORY_STYLES[article.category]}`}
            >
              {article.category}
            </span>

            {article.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndexImage((i) => (i === 0 ? article.images.length - 1 : i - 1))}
                  aria-label="Image précédente"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndexImage((i) => (i === article.images.length - 1 ? 0 : i + 1))}
                  aria-label="Image suivante"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {article.images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndexImage(i)}
                      aria-label={`Aller à l'image ${i + 1}`}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === indexImage ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="overflow-y-auto px-6 sm:px-8 py-6 sm:py-8">
            <DialogTitle className="text-gray-900 text-xl sm:text-2xl font-bold leading-tight mb-2">
              {article.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs mb-6">{article.date}</DialogDescription>

            <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
              {article.contenu.map((paragraphe, i) => (
                <p key={i}>{paragraphe}</p>
              ))}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
