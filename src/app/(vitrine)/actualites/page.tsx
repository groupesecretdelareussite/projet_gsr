"use client";

import Image from "next/image";
import Link from "next/link";
import { SlidersHorizontal, ArrowRight } from "lucide-react";

const ARTICLES = [
  {
    id: 1,
    title: "Calendrier des examens blancs : Session de Mai",
    category: "Examens",
    categoryBg: "bg-amber-50 text-amber-700 border-amber-200",
    description:
      "Consultez les dates importantes pour la prochaine session d'examens blancs. Une étape cruciale pour évaluer les acquis avant les épreuves finales.",
    image: "/images/galerie2.jpg",
    link: "#",
  },
  {
    id: 2,
    title: "Cérémonie de remise des prix : Félicitations à nos majors",
    category: "Réussite",
    categoryBg: "bg-blue-50 text-blue-700 border-blue-200",
    description:
      "Retour en images sur la soirée de célébration de l'excellence académique. Nos étudiants brillants mis à l'honneur pour leurs performances...",
    image: "/images/6d9c7e76c6d2309b391ea3fd18627e33.jpg",
    link: "#",
  },
  {
    id: 3,
    title: "Conseils méthodologiques : Comment gérer son stress avant...",
    category: "Vie Scolaire",
    categoryBg: "bg-red-50 text-red-700 border-red-200",
    description:
      "Notre équipe pédagogique partage des techniques éprouvées pour optimiser la concentration et réduire l'anxiété à l'approche des grands rendez-vous...",
    image: "/images/e030259761414fa2fea1d9d8b1ea0b4c.jpg",
    link: "#",
  },
  {
    id: 4,
    title: "Journée Portes Ouvertes : Venez découvrir nos nouveaux...",
    category: "Événement",
    categoryBg: "bg-green-50 text-green-700 border-green-200",
    description:
      "Nous invitons parents et futurs élèves à explorer nos installations de pointe récemment inaugurées. Un aperçu immersif de notre environnement.",
    image: "/images/science_lab.png",
    link: "#",
  },
];

export default function ActualitesPage() {
  return (
    <div className="bg-gray-50/50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Actualités & Événements
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Restez informé de la vie scolaire, des événements marquants et des réussites de notre communauté éducative. Découvrez les dernières nouvelles du GSR.
          </p>
        </div>

        {/* Featured Article Card (À la une) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Image Container */}
            <div className="relative h-[250px] sm:h-[350px] lg:h-auto lg:col-span-7 min-h-[300px]">
              <Image
                src="/images/img_accueil_1.png"
                alt="Préparations BAC 2026"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Content Container */}
            <div className="p-6 sm:p-8 lg:p-12 lg:col-span-5 flex flex-col justify-center">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-primary border border-green-200 mb-4">
                  À la une
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  Préparations intensives pour le BAC 2026 : Le GSR mobilise ses experts
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                  Afin d'assurer la réussite de nos futurs bacheliers, le Groupe met en place un programme d'accompagnement sur-mesure. Nos enseignants...
                </p>
              </div>
              <div>
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold text-sm transition-colors group"
                >
                  Lire l'article complet
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Latest News Section Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dernières Actualités
          </h3>
          <button className="p-2 text-gray-600 hover:text-primary transition-colors border border-gray-200 hover:border-primary/30 rounded-lg bg-white shadow-sm flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Latest News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTICLES.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              
              {/* Card Image */}
              <div className="relative h-48 w-full bg-gray-100">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Card Body */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  {/* Category Badge */}
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${article.categoryBg} mb-4`}
                  >
                    {article.category}
                  </span>
                  
                  {/* Title */}
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 leading-snug line-clamp-2">
                    {article.title}
                  </h4>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {article.description}
                  </p>
                </div>

                {/* Link */}
                <div>
                  <Link
                    href={article.link}
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark font-semibold text-sm transition-colors group"
                  >
                    Découvrir
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
