"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, BookOpen, Users, Trophy, ChevronDown, CheckCircle, Phone } from "lucide-react";
import { useState, useEffect } from "react";

function Counter({ value, suffix="" }: { value: number; suffix?: string }) {

  const [count,setCount] = useState(0);


  useEffect(()=>{

    let start = 0;

    const duration = 4500;

    const increment = value / (duration / 16);


    const timer = setInterval(()=>{

      start += increment;

      if(start >= value){
        setCount(value);
        clearInterval(timer);
      }
      else{
        setCount(Math.floor(start));
      }

    },16);


    return ()=>clearInterval(timer);


  },[value]);


  return (
    <h3 className="text-4xl font-bold text-primary mb-2">
      {count}{suffix}
    </h3>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);


  const heroImages = [
    "/images/img_accueil_2.png",
    "/images/img_accueil_3.png",
    "/images/img_accueil_4.png",
    "/images/img_accueil_6.png",
    "/images/img_accueil_7.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const faqs = [
    { q: "Comment se déroulent les séances de soutien ?", a: "Nos séances se déroulent en présentiel avec des groupes restreints. Chaque élève bénéficie d'un suivi régulier, d'évaluations périodiques et d'un accompagnement personnalisé selon ses difficultés." },
    { q: "Quels sont les tarifs mensuels ?", a: "Les tarifs varient en fonction de la classe (de la 6ème à la Terminale). Les paiements peuvent être effectués en ligne via Mobile Money ou en présentiel. Veuillez nous contacter pour la grille tarifaire complète." },
    { q: "Quels sont les rôles des superviseurs ?", a: "Les superviseurs encadrent les élèves, s'assurent de leur présence effective, vérifient l'assimilation des cours et font le pont entre les enseignants et la direction pédagogique." },
    { q: "Comment s'inscrire à une séance ?", a: "Vous pouvez inscrire votre enfant en vous rendant dans l'un de nos centres (Akpakpa Yagbé, Jéricho, Vèdoko.) avec les pièces requises et en remplissant le formulaire d'inscription physique." },
    { q: "Quel est le programme des cours préparatoires ?", a: "Le programme couvre rigoureusement le programme officiel de l'éducation nationale, avec un accent particulier sur les matières principales (Mathématiques, Physique-Chimie, Français, SVT, Anglais) selon la série." },
    { q: "Quels sont les horaires des cours ?", a: "Les cours se déroulent principalement les mercredis après-midi, samedis et dimanches pour s'adapter au calendrier scolaire classique de vos enfants." },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section — position: relative, overflow: hidden */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        {/* Texture photo discrète, cohérente avec l'en-tête À propos */}
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/images/imgC.jpg"
            alt=""
            fill
            className="object-cover blur-sm scale-105"
          />
        </div>

        {/* Images en rotation — absolute, collées en bas à droite, z-index: 1 */}
        <div
          className="absolute bottom-0 right-0 hidden lg:block"
          style={{ width: "650px", height: "560px", zIndex: 1 }}
        >
          {heroImages.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              {/*
              <Image
                src={src}
                alt={`Illustration accueil ${index + 1}`}
                fill
                className="object-contain object-bottom drop-shadow-[0_0_8px_white]"
              /> */}
              <Image
                  src={src}
                  alt=""
                  fill
                  className="object-contain object-bottom scale-105 brightness-0 invert"
                  aria-hidden="true"
                />

                {/* Image originale au-dessus */}
                <Image
                  src={src}
                  alt={`Illustration accueil ${index + 1}`}
                  fill
                  className="object-contain object-bottom"
                  priority={index === 0}
                />


            </div>
          ))}
        </div>

        {/* Contenu texte — z-index: 2 (au-dessus de l'image) */}
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative"
          style={{ zIndex: 2 }}
        >
          <div className="text-white space-y-5 py-14 lg:py-20 max-w-xl">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight uppercase leading-tight lg:w-max lg:whitespace-nowrap lg:max-w-none">
              GROUPE SECRET DE LA RÉUSSITE
            </h1>
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-secondary">
              L&apos;excellence scolaire, notre engagement !
            </h2>
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed">
              Rejoignez le G.S.R pour un accompagnement scolaire de qualité.
              Des enseignants engagés, un encadrement sur mesure et des résultats
              prouvés pour la réussite de vos enfants au Bénin.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/programmes"
                className="bg-primary text-white hover:bg-primary-dark px-5 py-2.5 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
              >
                Découvrir nos programmes
              </Link>
              <Link
                href="/portail-parents"
                className="bg-transparent border border-white text-white hover:bg-white hover:text-primary px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                Portail Parent
              </Link>
              <Link
                href="/contact"
                className="bg-white text-primary hover:bg-gray-100 px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                Rejoindre le Groupe
              </Link>
            </div>
          </div>
        </div>

        {/* Espace bas pour le chevauchement des cartes statistiques */}
        <div className="h-16 sm:h-20"></div>
      </section>

      {/* Stats overlapping cards — z-index: 10 (au-dessus de tout) */}
      <section
        className="relative -mt-12 sm:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ zIndex: 10 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center transform transition hover:-translate-y-1">
            <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
              <BookOpen className="w-8 h-8" />
            </div>
            <Counter value={5} suffix="+" />
            <p className="text-gray-600 font-medium">Années d&apos;expérience</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center transform transition hover:-translate-y-1">
            <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
              <Users className="w-8 h-8" />
            </div>
            <Counter value={800} suffix="+" />
            <p className="text-gray-600 font-medium">Élèves formés en 2025</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center transform transition hover:-translate-y-1">
            <div className="bg-secondary/20 p-4 rounded-full mb-4 text-secondary">
              <Trophy className="w-8 h-8" />
            </div>
            <Counter value={86} suffix="%" />
            <p className="text-gray-600 font-medium">Taux de Réussite</p>
          </div>
        </div>
      </section>

      {/* Nos Prestations Section */}
      <section className="py-24 bg-surface max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Nos Prestations</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Un accompagnement d&apos;excellence pour chaque étape de la réussite académique de votre enfant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
            <div className="relative h-56 w-full">
              <Image src="/images/img_cip.jpg" alt="Cours Intensifs" fill className="object-cover" />
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary rounded-full p-2">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Cours Intensifs Préparatoires</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-grow">
                En vacances, nous offrons des séances préparatoires pensées pour corriger les lacunes antérieures 
                et aborder en douceur les nouvelles notions : documents de cours à l&apos;appui et évaluations ciblées 
                pour consolider les acquis.
              </p>
              <Link href="/programmes" className="text-primary font-bold flex items-center text-sm hover:underline">
                En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
            <div className="relative h-56 w-full">
              <Image src="/images/img_pas.jpg" alt="Accompagnement Scolaire" fill className="object-cover" />
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-secondary rounded-full p-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Programme d&apos;Accompagnement Scolaire (T.D)</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-grow">
                Un suivi régulier et personnalisé des notes de chaque enfant tout au long de l&apos;année scolaire. Des séances intensives pour 
                maîtriser le programme, combler les lacunes au fur et mesure et exceller dans toutes les matières.
              </p>
              <Link href="/programmes" className="text-secondary font-bold flex items-center text-sm hover:underline">
                En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
            <div className="relative h-56 w-full">
              <Image src="/images/img_prepa.jpg" alt="Préparation Examens" fill className="object-cover" />
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary rounded-full p-2">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Préparation aux Examens</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-grow">
                Un entraînement spécifique pour le BEPC et le BAC avec des examens blancs et des corrections 
                méthodiques. Et un module de Développement personnel pour préparer nos élèves à aborder sereinement 
                leurs examens avec confiance et méthode.
              </p>
              <Link href="/programmes" className="text-primary font-bold flex items-center text-sm hover:underline">
                En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
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
          <Image src="/images/video-poster.jpeg" alt="Vidéo de présentation" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
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
          <a
            href="tel:+2290196084067"
            className="bg-dark text-white hover:bg-dark/90 px-8 py-3 rounded-md font-medium inline-flex items-center gap-2 transition-colors shadow-md"
          >
            <Phone className="w-5 h-5" />
            Prendre contact avec nous
          </a>
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
    </div>
  );
}
