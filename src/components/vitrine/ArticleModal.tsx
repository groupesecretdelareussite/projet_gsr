"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Article } from "@/lib/actualites";
import { CATEGORY_STYLES } from "@/lib/actualites";

interface ArticleModalProps {
  article: Article | null;
  onOpenChange: (open: boolean) => void;
}

const SEUIL_SWIPE_PX = 50;

/** Remonté à chaque nouvel article via `key` sur l'appelant — réinitialise `indexImage`/`indiceVisible` naturellement, sans effet dédié. */
function ArticleModalContent({ article }: { article: Article }) {
  const [indexImage, setIndexImage] = useState(0);
  const [indiceVisible, setIndiceVisible] = useState(article.images.length > 1);
  const touchStartX = useRef<number | null>(null);
  const multiImages = article.images.length > 1;

  useEffect(() => {
    if (!indiceVisible) return;
    const timer = setTimeout(() => setIndiceVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [indiceVisible]);

  function imagePrecedente() {
    setIndexImage((i) => (i === 0 ? article.images.length - 1 : i - 1));
  }
  function imageSuivante() {
    setIndexImage((i) => (i === article.images.length - 1 ? 0 : i + 1));
  }
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    setIndiceVisible(false);
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SEUIL_SWIPE_PX) return;
    if (delta < 0) imageSuivante();
    else imagePrecedente();
  }

  return (
    <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] flex flex-col gap-0 p-0">
          <div
            className="relative h-56 sm:h-72 shrink-0 bg-gray-100 touch-pan-y"
            onTouchStart={multiImages ? handleTouchStart : undefined}
            onTouchEnd={multiImages ? handleTouchEnd : undefined}
          >
            <Image
              src={article.images[indexImage]}
              alt={article.title}
              fill
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span
              className={`absolute top-4 left-4 inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${CATEGORY_STYLES[article.category]}`}
            >
              {article.category}
            </span>

            {multiImages && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIndiceVisible(false);
                    imagePrecedente();
                  }}
                  aria-label="Image précédente"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIndiceVisible(false);
                    imageSuivante();
                  }}
                  aria-label="Image suivante"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div
                  className={`absolute inset-x-0 bottom-9 flex justify-center pointer-events-none transition-opacity duration-500 ${
                    indiceVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex items-center gap-1.5 bg-black/50 text-white text-[11px] font-medium pl-2 pr-2.5 py-1.5 rounded-full">
                    <ChevronLeft className="w-3 h-3" />
                    Glissez pour naviguer
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {article.images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setIndiceVisible(false);
                        setIndexImage(i);
                      }}
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
  );
}

export function ArticleModal({ article, onOpenChange }: ArticleModalProps) {
  return (
    <Dialog open={article !== null} onOpenChange={onOpenChange}>
      {article && <ArticleModalContent key={article.id} article={article} />}
    </Dialog>
  );
}
