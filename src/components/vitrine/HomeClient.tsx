"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, BookOpen, Users, Trophy, ChevronDown, CheckCircle, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import RecrutementProfModal from "@/components/vitrine/RecrutementProfModal";

/** Images de la page d'accueil hébergées dans le bucket public "galerie" (dossier vitrine/accueil), remplace public/images. */
const STORAGE_ACCUEIL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie/vitrine/accueil`;

/** Cartes des prestations GSR avec offsets sticky adaptés pour l'empilement mobile sous la navbar (h-16 = 64px) */
const PRESTATIONS = [
  {
    id: "01",
    tag: "En Vacances",
    title: "Cours Intensifs Préparatoires",
    description:
      "En vacances, nous offrons des séances préparatoires pensées pour corriger les lacunes antérieures et aborder en douceur les nouvelles notions : documents de cours à l'appui et évaluations ciblées pour consolider les acquis.",
    image: `${STORAGE_ACCUEIL}/img_cip.jpg`,
    alt: "Cours Intensifs Préparatoires",
    icon: BookOpen,
    accent: "primary" as const,
    link: "/programmes",
    mobileTop: "top-[76px]",
    zIndex: "z-10",
  },
  {
    id: "02",
    tag: "Année Scolaire",
    title: "Programme d'Accompagnement Scolaire (T.D)",
    description:
      "Un suivi régulier et personnalisé des notes de chaque enfant tout au long de l'année scolaire. Des séances intensives pour maîtriser le programme, combler les lacunes au fur et mesure et exceller dans toutes les matières.",
    image: `${STORAGE_ACCUEIL}/img_pas.jpg`,
    alt: "Accompagnement Scolaire",
    icon: CheckCircle,
    accent: "secondary" as const,
    link: "/programmes",
    mobileTop: "top-[96px]",
    zIndex: "z-20",
  },
  {
    id: "03",
    tag: "BEPC & BAC",
    title: "Préparation aux Examens",
    description:
      "Un entraînement spécifique pour le BEPC et le BAC avec des examens blancs et des corrections méthodiques. Et un module de Développement personnel pour préparer nos élèves à aborder sereinement leurs examens avec confiance et méthode.",
    image: `${STORAGE_ACCUEIL}/img_prepa.jpg`,
    alt: "Préparation aux Examens",
    icon: Trophy,
    accent: "primary" as const,
    link: "/programmes",
    mobileTop: "top-[116px]",
    zIndex: "z-30",
  },
];

function Counter({ value, suffix="" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2500;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {count}{suffix}
    </span>
  );
}

export default function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Image unique : l'élève en jaune (img_accueil_4.png)
  const heroImage = `${STORAGE_ACCUEIL}/img_accueil_4.png`;

  const faqs = [
    { q: "Comment se déroulent les séances de soutien ?", a: "Nos séances se déroulent en présentiel. Chaque élève bénéficie d'un suivi régulier, d'évaluations périodiques et d'un accompagnement personnalisé selon ses difficultés." },
    { q: "Quels sont les tarifs mensuels ?", a: "Les tarifs varient en fonction de la classe (de la 6ème à la Terminale). Les paiements peuvent être effectués en ligne via Mobile Money ou en présentiel. Veuillez nous contacter pour la grille tarifaire complète." },

    { q: "Comment inscrire mon enfant ?", a: "Vous pouvez inscrire votre enfant en vous rendant dans l'un de nos centres (Akpakpa Yagbé, Jéricho, Vèdoko.) en remplissant le formulaire d'inscription physique." },
    { q: "Quel est le programme des cours préparatoires ?", a: "Le programme couvre rigoureusement les premières notions abordées dès la rentrée dans les matières principales (Mathématiques, PCT, Français, SVT, Anglais, Economie) selon la série." },
    { q: "Quels sont les horaires des cours ?", a: "Les cours se déroulent principalement les mercredis dans l'après-midi, les samedis et les dimanches en fontion de la classe." },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section — Design Moderne Inspiré de la maquette avec l'élève en jaune */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #03210c 0%, #064016 40%, #0a561c 75%, #0e7024 100%)" }}
      >
        {/* Texture de carroyage / grille millimétrée subtile en filigrane */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        />

        {/* Halo lumineux radial vert émeraude doux sous la composition visuelle */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 75% 45%, rgba(18, 170, 0, 0.22) 0%, transparent 60%)",
          }}
        />

        {/* Conteneur principal Responsive */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-6 sm:pt-8 lg:pt-10 pb-0 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-end lg:items-start">
            
            {/* Colonne Gauche : Textes, Slogan et Actions (En avant-plan z-30, calée vers le haut pour combler le vide) */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6 pt-2 sm:pt-4 lg:pt-6 xl:pt-8 pb-10 lg:pb-14 relative z-30 lg:self-start">
              
              {/* Titre Principal H1 comme avant */}
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight uppercase leading-tight text-white lg:w-max lg:whitespace-nowrap lg:max-w-none">
                GROUPE SECRET DE LA RÉUSSITE
              </h1>

              {/* Slogan H2 avec taille réduite et surlignage sobre sans émoji */}
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-secondary">
                L&apos;excellence{" "}
                <span className="relative inline-block px-2.5 py-0.5 mx-1 text-gray-950 font-bold bg-[#f6b40a] rounded shadow-xs -rotate-1 select-none">
                  scolaire
                </span>
                , notre engagement !
              </h2>

              {/* Paragraphe descriptif */}
              <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
                Rejoignez le G.S.R pour un accompagnement scolaire de qualité. Des enseignants engagés, un encadrement sur mesure et des résultats prouvés pour la réussite de vos enfants au Bénin.
              </p>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/programmes"
                  className="w-full sm:w-auto bg-[#12aa00] hover:bg-[#0e8f00] text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Découvrir nos programmes</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/portail-parents"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/25 text-white px-5 py-3 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Portail Parent
                </Link>
                <Link
                  href="/td/login"
                  className="w-full sm:w-auto bg-white text-[#05330f] hover:bg-emerald-50 px-5 py-3 rounded-lg text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Portail Professeurs
                </Link>
              </div>
            </div>

            {/* Colonne Droite : Composition Élève + Orbite Resserrée + Badges Flottants (Arrière-plan z-10 par rapport aux textes, collée en bas du hero) */}
            <div className="lg:col-span-5 flex justify-center items-end relative z-10 select-none self-end -mb-px">
              <div className="relative w-full max-w-[420px] sm:max-w-[500px] lg:max-w-[560px] xl:max-w-[620px] h-[450px] sm:h-[530px] lg:h-[610px] xl:h-[660px] flex items-end justify-center">

                {/* Halo d'ambiance concentré derrière le haut du corps */}
                <div className="absolute w-[280px] sm:w-[340px] lg:w-[400px] h-[280px] sm:h-[340px] lg:h-[400px] top-28 sm:top-32 lg:top-36 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

                {/* Ligne orbitale elliptique réduite et resserrée autour du buste/épaules */}
                <div
                  className="absolute w-[290px] sm:w-[360px] lg:w-[430px] h-[210px] sm:h-[260px] lg:h-[300px] top-24 sm:top-28 lg:top-32 rounded-[50%] border border-dashed border-emerald-300/30 pointer-events-none"
                  style={{ transform: "rotate(-8deg)" }}
                />

                {/* Badge Flottant 1 : Mathématiques (Jaune, haut-gauche de la tête) */}
                <div
                  className="absolute top-16 sm:top-20 lg:top-22 left-4 sm:left-8 lg:left-2 z-20 px-2.5 py-1 rounded-lg bg-[#f6b40a] text-gray-950 text-[11px] sm:text-xs font-bold shadow-md shadow-amber-500/20 border border-amber-300/50 transform -rotate-6 hover:scale-105 transition-transform"
                >
                  Mathématiques
                </div>

                {/* Badge Flottant 2 : PCT (Bleu Cyan, haut-droite de la tête) */}
                <div
                  className="absolute top-20 sm:top-24 lg:top-26 right-4 sm:right-8 lg:right-2 z-20 px-2.5 py-1 rounded-lg bg-sky-400 text-slate-950 text-[11px] sm:text-xs font-bold shadow-md shadow-sky-500/20 border border-sky-300/50 transform rotate-3 hover:scale-105 transition-transform"
                >
                  PCT
                </div>

                {/* Badge Flottant 3 : BEPC & BAC (Vert Menthe, gauche épaule) */}
                <div
                  className="absolute top-52 sm:top-60 lg:top-68 left-0 sm:left-4 lg:-left-2 z-20 px-2.5 py-1 rounded-lg bg-emerald-400 text-emerald-950 text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-500/20 border border-emerald-300/50 transform -rotate-3 hover:scale-105 transition-transform"
                >
                  BEPC &amp; BAC
                </div>

                {/* Badge Flottant 4 : Excellence (Fuchsia, droite bras) */}
                <div
                  className="absolute top-56 sm:top-64 lg:top-72 right-0 sm:right-4 lg:-right-2 z-20 px-2.5 py-1 rounded-lg bg-pink-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-pink-500/20 border border-pink-400/50 transform rotate-6 hover:scale-105 transition-transform"
                >
                  Excellence
                </div>

                {/* Badge Flottant 5 : Suivi sur-mesure (Ardoise sombre, bas-gauche près du livre) */}
                <div
                  className="absolute bottom-10 sm:bottom-12 lg:bottom-14 left-6 sm:left-10 lg:left-6 z-20 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] sm:text-xs font-semibold shadow-md shadow-black/30 border border-white/20 transform rotate-2 hover:scale-105 transition-transform"
                >
                  Suivi sur-mesure
                </div>

                {/* Silhouette agrandie et mise en valeur de l'enfant en jaune, collée strictement en bas */}
                <div className="relative w-[340px] sm:w-[440px] lg:w-[520px] xl:w-[580px] h-[430px] sm:h-[510px] lg:h-[590px] xl:h-[640px] z-10">
                  <Image
                    src={heroImage}
                    alt="Élève du Groupe Secret de la Réussite"
                    fill
                    sizes="(max-width: 640px) 340px, (max-width: 1024px) 480px, 580px"
                    className="object-contain object-bottom scale-105 sm:scale-110 lg:scale-[1.18] xl:scale-[1.22] origin-bottom drop-shadow-[0_16px_36px_rgba(0,0,0,0.5)]"
                    priority
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bandeau Statistiques — Couleur exacte du footer (bg-dark) */}
      <section className="bg-dark border-y border-white/10 text-white py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 md:divide-x md:divide-white/10">
            
            {/* Stat 1 : Années d'expérience */}
            <div className="flex items-center gap-4 text-left md:justify-center md:text-center md:flex-col md:gap-2">
              <div className="w-12 h-12 rounded-xl  border border-white/15 flex items-center justify-center text-[#f6b40a] shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  <Counter value={5} suffix="+" />
                </div>
                <p className="text-emerald-200/80 text-xs sm:text-sm font-medium">
                  Années d&apos;expérience
                </p>
              </div>
            </div>

            {/* Stat 2 : Élèves formés en 2025 */}
            <div className="flex items-center gap-4 text-left md:justify-center md:text-center md:flex-col md:gap-2 md:pl-8">
              <div className="w-12 h-12 rounded-xl  border border-white/15 flex items-center justify-center text-[#f6b40a] shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  <Counter value={800} suffix="+" />
                </div>
                <p className="text-emerald-200/80 text-xs sm:text-sm font-medium">
                  Élèves formés en 2025
                </p>
              </div>
            </div>

            {/* Stat 3 : Taux de réussite en 2025 */}
            <div className="flex items-center gap-4 text-left md:justify-center md:text-center md:flex-col md:gap-2 md:pl-8">
              <div className="w-12 h-12 rounded-xl  border border-white/15 flex items-center justify-center text-[#f6b40a] shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl lg:text-4xl font-extrabold text-[#f6b40a] tracking-tight">
                  <Counter value={86} suffix="%" />
                </div>
                <p className="text-emerald-200/80 text-xs sm:text-sm font-medium">
                  Taux de Réussite en 2025
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Nos Prestations Section */}
      <section className="py-20 md:py-24 bg-surface max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12 md:mb-16">
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Nos Prestations</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-base">
            Un accompagnement d&apos;excellence pour chaque étape de la réussite académique de votre enfant.
          </p>
        </div>

        {/* Cartes : empilement sticky sur mobile (< md) et grille responsive 3 colonnes sur desktop (>= md) */}
        <div className="relative block md:grid md:grid-cols-3 md:gap-8">
          {PRESTATIONS.map((prestation, index) => {
            const Icon = prestation.icon;
            const isSecondary = prestation.accent === "secondary";
            const isLast = index === PRESTATIONS.length - 1;

            return (
              <div
                key={prestation.id}
                className={`
                  group
                  sticky ${prestation.mobileTop} ${prestation.zIndex}
                  md:static md:top-auto md:z-auto
                  bg-white rounded-2xl
                  shadow-[0_12px_32px_rgba(0,0,0,0.08)] md:shadow-md md:hover:shadow-xl
                  border border-gray-100/90
                  border-t-4 ${isSecondary ? "border-t-secondary" : "border-t-primary"}
                  overflow-hidden flex flex-col
                  transition-all duration-300
                  ${isLast ? "mb-0" : "mb-10 sm:mb-12 md:mb-0"}
                `}
              >
                <div className="relative h-48 sm:h-52 md:h-56 w-full overflow-hidden bg-gray-100">
                  <Image
                    src={prestation.image}
                    alt={prestation.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`rounded-full p-2.5 text-white shadow-sm flex-shrink-0 ${
                        isSecondary ? "bg-secondary" : "bg-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {prestation.title}
                    </h3>
                  </div>

                  <p className="text-gray-600 text-sm mb-6 flex-grow leading-relaxed">
                    {prestation.description}
                  </p>

                  <Link
                    href={prestation.link}
                    className={`font-bold flex items-center text-sm hover:underline mt-auto pt-2 ${
                      isSecondary ? "text-amber-600" : "text-primary"
                    }`}
                  >
                    En savoir plus <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Tarifaire Section */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-dark via-primary/95 to-primary p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-56 h-56 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 space-y-3 max-w-2xl text-center md:text-left">
              <span className="text-secondary font-bold text-xs uppercase tracking-wider bg-secondary/10 px-3 py-1 rounded-full">
                Tarifs transparents
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Consultez nos tarifs et formules d&apos;accompagnement
              </h3>
              <p className="text-gray-200 text-sm md:text-base">
                Découvrez des tarifs adaptés et des solutions de soutien scolaire sur mesure pour la réussite de vos enfants.
              </p>
            </div>

            <div className="relative z-10 flex-shrink-0">
              <Link
                href="/tarifs"
                className="bg-secondary hover:bg-secondary/90 text-dark font-bold px-6 py-3.5 rounded-lg text-sm transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2 shadow-lg hover:shadow-secondary/20"
              >
                Voir notre grille tarifaire
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages Section */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Témoignages</h2>
            <p className="text-gray-600">Ce que disent les parents et les élèves...</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex gap-1 text-secondary mb-4">
                  {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                </div>
                <p className="text-gray-700 italic mb-6 flex-grow font-medium leading-relaxed">
                  &ldquo;{item === 1 ? "Grâce au GSR, mon fils a pu décrocher son BEPC avec mention. Les profs sont très engagés et le suivi est strict !" : item === 2 ? "L'encadrement y est très professionnel. L'application permet de suivre la présence de mon enfant en temps réel." : "J'ai adoré les TD de mathématiques et de physique. L'ambiance est studieuse et on comprend beaucoup mieux !"}&rdquo;
                </p>
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-50">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item === 3 ? 'Aline K.' : item === 1 ? 'Marc DOSSOU' : 'Jeanne T.'}</h4>
                    <p className="text-sm text-gray-500">{item === 3 ? "Élève - Tle" : "Parent d'élève"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-24 bg-surface max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-12">Découvrez notre groupe en vidéo</h2>
        <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-video group cursor-pointer border border-gray-100">
          <Image src={`${STORAGE_ACCUEIL}/video-poster.jpeg`} alt="Vidéo de présentation" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              <Play className="w-6 h-6 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-surface">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Besoin d&apos;un accompagnement personnalisé à domicile ?</h2>
          <p className="text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Nous vous mettons en relation avec des répétiteurs qualifiés, rigoureusement sélectionnés pour répondre aux besoins spécifiques de votre enfant à domicile.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="tel:+2290196084067"
              className="bg-dark text-white hover:bg-dark/90 px-8 py-3 rounded-md font-medium inline-flex items-center gap-2 transition-colors shadow-md"
            >
              <Phone className="w-5 h-5" />
              Appeler MTN
            </a>
            <a
              href="tel:+2290149761635"
              className="bg-dark text-white hover:bg-dark/90 px-8 py-3 rounded-md font-medium inline-flex items-center gap-2 transition-colors shadow-md"
            >
              <Phone className="w-5 h-5" />
              Appeler Celtiis
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Questions Fréquentes</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`bg-white border rounded-lg overflow-hidden transition-colors shadow-sm ${openFaq === index ? 'border-gray-300 ring-1 ring-gray-300' : 'border-gray-200'}`}
              >
                <button
                  className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-800">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180 text-gray-800' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4 mt-2">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal Popup Recrutement Professeurs */}
      <RecrutementProfModal />
    </div>
  );
}
