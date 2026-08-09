"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

const STORAGE_GALERIE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie/vitrine/galerie`;

// ─── Catégories ──────────────────────────────────────────────────────────────
// Reflète les 4 dossiers réels du bucket Storage (vitrine/galerie/<dossier>) —
// si un dossier est ajouté/retiré côté Storage, garder cette liste synchronisée à la main.
const CATEGORIES = ["Tous", "Vie Scolaire", "Activités TD", "Coaching & Conseils", "Examens & Contrôle"];

// ─── Photos ──────────────────────────────────────────────────────────────────
type Photo = {
  id: number;
  src: string;
  alt: string;
  categorie: string;
  tall?: boolean;   // hauteur double dans la grille masonry
  wide?: boolean;   // largeur double (colonne 2)
};

// Entrelacé par catégorie (round-robin) plutôt que groupé, pour que la vue
// "Tous" mélange naturellement les 4 catégories au lieu de les afficher en blocs.
const VIE_SCOLAIRE = [
  "IMG_20250714_081429_741.jpg",
  "IMG_20250714_103226_668.jpg",
  "IMG_20250715_102159_233.jpg",
  "IMG_20250717_181250_248.jpg",
  "IMG_20250717_181308_249.jpg",
  "IMG_20250717_181334_216.jpg",
  "IMG_20250723_121546_022.jpg",
  "IMG_20260314_153611_675.jpg",
];
const ACTIVITES_TD = [
  "IMG_20250714_103435_253.jpg",
  "IMG_20250714_103444_656.jpg",
  "IMG_20250714_115832_914.jpg",
  "IMG_20250714_123114_742.jpg",
  "IMG_20250717_161215_693.jpg",
  "IMG_20250717_161718_750.jpg",
  "IMG_20250717_170311_542.jpg",
  "IMG_20260221_092842_827.jpg",
  "IMG_20260221_092901_305.jpg",
  "IMG_20260221_092914_792.jpg",
];
const COACHING_CONSEILS = [
  "IMG_20260314_153840_505.jpg",
  "IMG_20260314_153859_266.jpg",
  "IMG_20260314_155954_181.jpg",
  "IMG_20260314_161928_923.jpg",
  "IMG_20260314_164817_725.jpg",
  "IMG_20260314_170813_823.jpg",
  "IMG_20260314_172001_416.jpg",
  "IMG_20260314_172541_748.jpg",
  "IMG_20260314_172559_885.jpg",
  "IMG_20260314_175046_568.jpg",
];
const EXAMENS_CONTROLE = [
  "IMG_20251122_110004_939.jpg",
  "IMG_20251122_110009_264.jpg",
  "IMG_20251122_110023_230.jpg",
];

function construirePhotos(): Photo[] {
  const groupes: { dossier: string; fichiers: string[]; categorie: string; alt: string }[] = [
    { dossier: "vie_scolaire", fichiers: VIE_SCOLAIRE, categorie: "Vie Scolaire", alt: "Vie scolaire — moment du quotidien" },
    { dossier: "activites_td", fichiers: ACTIVITES_TD, categorie: "Activités TD", alt: "Séance de cours de renfort (TD)" },
    { dossier: "coaching_conseils", fichiers: COACHING_CONSEILS, categorie: "Coaching & Conseils", alt: "Séance de coaching et conseils" },
    { dossier: "examens_controle", fichiers: EXAMENS_CONTROLE, categorie: "Examens & Contrôle", alt: "Session d'examen blanc" },
  ];

  const photos: Photo[] = [];
  let id = 1;
  let indexDansGroupe = 0;
  let restant = groupes.reduce((s, g) => s + g.fichiers.length, 0);

  while (restant > 0) {
    for (const g of groupes) {
      const fichier = g.fichiers[indexDansGroupe];
      if (!fichier) continue;
      photos.push({
        id: id++,
        src: `${STORAGE_GALERIE}/${g.dossier}/${fichier}`,
        alt: `${g.alt} (${indexDansGroupe + 1})`,
        categorie: g.categorie,
        tall: id % 5 === 0,
      });
      restant--;
    }
    indexDansGroupe++;
  }

  return photos;
}

const PHOTOS: Photo[] = construirePhotos();

const VISIBLE_INITIAL = 7;

export default function GalerieClient() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [visibleCount, setVisibleCount] = useState(VISIBLE_INITIAL);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const filtered =
    activeCategory === "Tous"
      ? PHOTOS
      : PHOTOS.filter((p) => p.categorie === activeCategory);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-white py-12 text-center px-4 border-b border-gray-100">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
          Notre Galerie Photos
        </h1>
        <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Découvrez l'environnement stimulant et les moments marquants de la vie à
          GSR. Une plongée visuelle dans notre quotidien éducatif.
        </p>
      </div>

      {/* ── Contenu ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Filtre catégories ── */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(VISIBLE_INITIAL);
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Grille Masonry (CSS columns) — 2 colonnes mobile, 3 dès la tablette (md) ── */}
        <div className="columns-2 md:columns-3 gap-3">
          {visible.map((photo) => (
            <div
              key={photo.id}
              className="break-inside-avoid mb-3 relative overflow-hidden rounded-xl cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
              style={{ display: "inline-block", width: "100%" }}
              onClick={() => setLightbox(photo)}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                width={600}
                height={photo.tall ? 700 : 400}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ height: photo.tall ? "clamp(220px, 40vw, 400px)" : "clamp(120px, 20vw, 220px)" }}
              />
              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                <div className="w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <span className="inline-block bg-primary/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {photo.categorie}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message si aucun résultat */}
        {visible.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">Aucune photo dans cette catégorie.</p>
          </div>
        )}

        {/* ── Bouton Charger plus ── */}
        {hasMore && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setVisibleCount((v) => v + 6)}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 bg-white hover:border-primary hover:text-primary px-7 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm"
            >
              Charger plus d'images
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.src}
              alt={lightbox.alt}
              width={900}
              height={600}
              className="w-full h-auto object-contain max-h-[85vh]"
            />
            <button
              aria-label="Fermer"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg transition-colors"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
              <span className="text-white text-sm font-medium">{lightbox.alt}</span>
              <span className="ml-3 bg-primary/80 text-white text-xs px-2 py-0.5 rounded-full">
                {lightbox.categorie}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
