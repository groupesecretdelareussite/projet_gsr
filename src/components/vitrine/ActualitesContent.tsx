"use client";

import { useState } from "react";
import Image from "next/image";
import { SlidersHorizontal, ArrowRight } from "lucide-react";
import { CATEGORY_STYLES, type Article } from "@/lib/actualites";
import { ArticleModal } from "@/components/vitrine/ArticleModal";

export function ActualitesContent({ aLaUne, autresArticles }: { aLaUne: Article | null; autresArticles: Article[] }) {
  const [articleOuvert, setArticleOuvert] = useState<Article | null>(null);

  return (
    <>
      {/* Featured Article Card (À la une) */}
      {aLaUne && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative h-[250px] sm:h-[350px] lg:h-auto lg:col-span-7 min-h-[300px]">
              <Image
                src={aLaUne.images[0]}
                alt={aLaUne.title}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
                priority
              />
            </div>

            <div className="p-6 sm:p-8 lg:p-12 lg:col-span-5 flex flex-col justify-center">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-primary border border-green-200 mb-4">
                  À la une
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">{aLaUne.title}</h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">{aLaUne.description}</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setArticleOuvert(aLaUne)}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold text-sm transition-colors group"
                >
                  Lire l&apos;article complet
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Latest News Section Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Dernières Actualités</h3>
        <button className="p-2 text-gray-600 hover:text-primary transition-colors border border-gray-200 hover:border-primary/30 rounded-lg bg-white shadow-sm flex items-center justify-center">
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Latest News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {autresArticles.map((article) => (
          <div
            key={article.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={article.images[0]}
                alt={article.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>

            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CATEGORY_STYLES[article.category]} mb-4`}
                >
                  {article.category}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 leading-snug line-clamp-2">{article.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">{article.description}</p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setArticleOuvert(article)}
                  className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark font-semibold text-sm transition-colors group"
                >
                  Découvrir
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ArticleModal article={articleOuvert} onOpenChange={(open) => !open && setArticleOuvert(null)} />
    </>
  );
}
