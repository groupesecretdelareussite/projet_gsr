"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

// ─── Catégories ──────────────────────────────────────────────────────────────
const CATEGORIES = ["Tous", "Vie Scolaire", "Activités TD", "Réunions"];

// ─── Photos ──────────────────────────────────────────────────────────────────
type Photo = {
  id: number;
  src: string;
  alt: string;
  categorie: string;
  tall?: boolean;   // hauteur double dans la grille masonry
  wide?: boolean;   // largeur double (colonne 2)
};

const PHOTOS: Photo[] = [
  // Ligne 1 — gauche petite, droite grande
  {
    id: 1,
    src: "/images/service2.jpg",
    alt: "Élève concentrée",
    categorie: "Vie Scolaire",
  },
  {
    id: 2,
    src: "/images/imgC.jpg",
    alt: "Classe de TD – élèves attentifs",
    categorie: "Activités TD",
    tall: true,
  },
  // Ligne 2
  {
    id: 3,
    src: "/images/e030259761414fa2fea1d9d8b1ea0b4c.jpg",
    alt: "Élève avec lunettes",
    categorie: "Vie Scolaire",
  },
  {
    id: 4,
    src: "/images/58073249ed7563105d0c18ed4768e26d.jpg",
    alt: "Élèves en classe",
    categorie: "Activités TD",
  },
  {
    id: 5,
    src: "/images/service3.jpg",
    alt: "Étudiant motivé",
    categorie: "Vie Scolaire",
  },
  // Ligne 3
  {
    id: 6,
    src: "/images/service1.jpg",
    alt: "Élève souriante avec sac",
    categorie: "Vie Scolaire",
    tall: true,
  },
  {
    id: 7,
    src: "/images/galerie2.jpg",
    alt: "Élève avec livres",
    categorie: "Réunions",
  },
  // Extra (chargement)
  {
    id: 8,
    src: "/images/galerie3.jpeg",
    alt: "Rentrée scolaire",
    categorie: "Réunions",
  },
  {
    id: 9,
    src: "/images/galerie4.jpeg",
    alt: "Étudiant avec livre",
    categorie: "Activités TD",
  },
  {
    id: 10,
    src: "/images/6d9c7e76c6d2309b391ea3fd18627e33.jpg",
    alt: "Élève studieuse",
    categorie: "Vie Scolaire",
  },
  {
    id: 11,
    src: "/images/service1.jpg",
    alt: "Cours intensifs",
    categorie: "Activités TD",
  },
  {
    id: 12,
    src: "/images/imgA.png",
    alt: "Élève fière",
    categorie: "Réunions",
  },
];

const VISIBLE_INITIAL = 7;

export default function GaleriePage() {
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

        {/* ── Grille Masonry (CSS columns) ── */}
        <div
          className="gap-3"
          style={{
            columnCount: 2,
            columnGap: "12px",
          }}
        >
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
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg transition-colors"
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
