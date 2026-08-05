import Image from "next/image";
import { Target, Award, BookOpen, Users, Shield } from "lucide-react";

/** Images dédiées à la page À propos, hébergées dans le bucket public "galerie" (dossier vitrine/apropos), remplace public/images. */
const STORAGE_APROPOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie/vitrine/apropos`;

export default function AProposPage() {
  return (
    <div>
      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden py-24 sm:py-32 flex flex-col items-center justify-center text-center px-4"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        {/* Overlay image floue en fond */}
        <div className="absolute inset-0 opacity-10">
          <Image
            src={`${STORAGE_APROPOS}/img_hero_apropos.jpg`}
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4">
            À Propos de Nous
          </h1>
          <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mx-auto">
            L'excellence académique au service de la réussite de chaque élève, bâtie
            sur la rigueur, la discipline et l'innovation pédagogique.
          </p>
        </div>
      </div>

      {/* ── Notre Histoire ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Texte */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6">
                Notre Histoire
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                <p>
                  Fondé il y a plus de 5 ans au Bénin, le Groupe Secret de la Réussite (GSR) est
                  né d'une vision audacieuse : transformer le paysage éducatif en offrant un
                  encadrement d'excellence, accessible et rigoureux. Ce qui a commencé
                  comme une initiative de soutien scolaire pour quelques élèves s'est
                  rapidement transformé en une institution de référence.
                </p>
                <p>
                  Au fil des années, nous avons développé une approche pédagogique unique,
                  alliant suivi personnalisé, discipline bienveillante et méthodes
                  d'apprentissage innovantes. Notre engagement envers la réussite de nos
                  élèves a permis à des centaines de jeunes de surmonter leurs difficultés
                  académiques et d'exceller dans leurs parcours scolaires.
                </p>
                <p>
                  Aujourd'hui, fort de ses différents sites répartis dans le pays, le GSR est fier
                  d'avoir accompagné près de 1000 élèves. Il représente bien plus qu'un
                  centre d'études : c'est une communauté engagée où parents, enseignants et
                  élèves collaborent étroitement pour bâtir un avenir prometteur.
                </p>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { icon: BookOpen, label: "Années", val: "5+" },
                  { icon: Users, label: "Élèves accompagnés", val: "1000+" },
                  { icon: Award, label: "Taux de réussite", val: "90%" },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="text-xl font-bold text-primary">{val}</div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image */}
            <div
              className="relative h-[340px] sm:h-[420px] rounded-2xl overflow-hidden shadow-xl"
              style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
            >
              <Image
                src={`${STORAGE_APROPOS}/img_apropos.png`}
                alt="Élève du GSR"
                fill
                className="object-contain object-bottom"
              />
              {/* Badge flottant */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-800">Groupe Secret de la Réussite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Nos Valeurs ── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Nos Valeurs</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
              Les piliers qui soutiennent notre engagement envers l'éducation et la réussite
              de nos élèves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Carte 1 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3">Rigueur et Discipline</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Nous croyons qu'un cadre structuré est essentiel à l'apprentissage. Notre approche
                favorise la concentration, le respect et la persévérance.
              </p>
            </div>

            {/* Carte 2 — mise en avant */}
            <div
              className="rounded-2xl shadow-lg p-8 text-white md:-mt-4 hover:shadow-xl transition-shadow"
              style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
            >
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg mb-3">Excellence Pédagogique</h3>
              <p className="text-white/85 text-sm leading-relaxed">
                Nos équipes et enseignants utilisent des méthodes éducatives et innovantes
                pour assurer une compréhension profonde et durable.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3">Transparence</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Nous assurons une communication ouverte et régulière avec les parents, offrant une visibilité
                totale sur les progrès de leurs enfants.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notre Vision ── */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Texte */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-8">Notre Vision</h2>

              {/* Citation */}
              <blockquote className="relative bg-white border-l-4 border-primary rounded-r-2xl px-8 py-6 shadow-sm mb-8">
                <div className="text-5xl text-primary/20 font-serif leading-none mb-2">"</div>
                <p className="text-gray-800 font-semibold text-base sm:text-lg italic leading-relaxed -mt-4">
                  Nous croyons fermement qu'il n'y a pas de fatalité dans l'échec scolaire. Avec le bon
                  encadrement, chaque enfant a le potentiel de réussir et d'exceller.
                </p>
              </blockquote>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Notre objectif à long terme est de continuer à étendre notre impact, en offrant
                des opportunités éducatives de premier plan et en formant les leaders de demain,
                dotés de solides compétences académiques et d'une éthique de travail irréprochable.
              </p>
            </div>

            {/* Image */}
            <div className="relative h-[320px] sm:h-[400px] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/images/img_accueil_1.png"
                alt="Enfants qui réussissent"
                fill
                className="object-contain object-bottom"
                style={{ background: "linear-gradient(to bottom, #e8f5e9, #c8e6c9)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA bas de page ── */}
      <section className="py-16 bg-white border-t border-gray-100 text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Rejoignez la famille GSR
          </h3>
          <p className="text-gray-500 text-sm sm:text-base mb-8">
            Votre enfant mérite le meilleur encadrement. Contactez-nous pour en savoir plus sur
            nos programmes et nos sites d'accueil.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/programmes"
              className="bg-primary text-white px-7 py-3 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors shadow-sm"
            >
              Voir nos programmes
            </a>
            <a
              href="/sites"
              className="border border-primary text-primary px-7 py-3 rounded-lg font-semibold text-sm hover:bg-primary/5 transition-colors"
            >
              Trouver un site
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
