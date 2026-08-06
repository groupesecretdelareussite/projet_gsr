import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Phone, Calendar, Map } from "lucide-react";
import { CarteSites } from "@/components/vitrine/CarteSites";

/** Photos dédiées par site, hébergées dans le bucket public "galerie" (dossier vitrine/sites), remplace public/images. */
const STORAGE_SITES = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galerie/vitrine/sites`;

export const metadata: Metadata = {
  title: "Nos centres à Cotonou — Akpakpa Yagbé, Jéricho, Vèdoko | GSR",
  description:
    "Retrouvez le centre GSR le plus proche de chez vous à Cotonou : adresses, contacts et horaires de nos 3 sites.",
  alternates: { canonical: "/sites" },
  openGraph: {
    title: "Nos centres à Cotonou — Akpakpa Yagbé, Jéricho, Vèdoko | GSR",
    description: "Adresses, contacts et horaires de nos 3 sites à Cotonou.",
    url: "/sites",
  },
};

const SITES = [
  {
    nom: "Site Jéricho",
    badge: "Siège",
    adresse: "EPP Jéricho, Cotonou, Bénin",
    telephones: ["+229 01 49 76 16 35", "01 96 08 40 67"],
    horaires: "Mercredi - Samedi - Dimanche",
    image: `${STORAGE_SITES}/img_site_jericho.jpg`,
    mapsLink: "https://maps.app.goo.gl/v2pzFdxzzjHmYWhS9",
  },
  {
    nom: "Site Yagbé",
    badge: null,
    adresse: "EPP Yagbé, Akpakpa, Cotonou, Bénin",
    telephones: ["+229 01 49 76 16 35", "01 96 08 40 67"],
    horaires: "Samedi - Dimanche",
    image: `${STORAGE_SITES}/img_site_yagbe.jpg`,
    mapsLink: "https://maps.app.goo.gl/VfjjXX7TPVLqqUXA9",
  },
  {
    nom: "Site Vèdoko",
    badge: null,
    adresse: "EPP Vèdoko, Cotonou, Bénin",
    telephones: ["+229 01 49 76 16 35", "01 96 08 40 67"],
    horaires: "Samedi",
    image: `${STORAGE_SITES}/img_site_vedoko.jpg`,
    mapsLink: "https://maps.app.goo.gl/m47nSeyaeKkpn3kB6",
  },
];

export default function SitesPage() {
  return (
    <div>
      {/* ── Hero Header ── */}
      <div
        className="py-16 sm:py-20 px-4"
        style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Nos Sites au Bénin
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            Retrouvez-nous dans nos différents centres d&apos;excellence à travers le pays.
            Chaque site offre un environnement d&apos;apprentissage premium et sécurisé.
          </p>
        </div>
      </div>

      {/* ── Cartes des sites ── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {SITES.map((site) => (
            <div
              key={site.nom}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative h-48">
                <Image
                  src={site.image}
                  alt={site.nom}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
                {site.badge && (
                  <span className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                    {site.badge}
                  </span>
                )}
              </div>

              <div className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-3">{site.nom}</h3>

                <div className="space-y-2 text-sm text-gray-600 mb-5">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{site.adresse}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{site.telephones.join(" / ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span>{site.horaires}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={site.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <Map className="w-4 h-4" /> Voir sur la carte
                  </a>
                  <a
                    href={`tel:${site.telephones[0].replace(/\s/g, "")}`}
                    className="inline-flex items-center justify-center border border-primary text-primary px-3.5 py-2.5 rounded-lg hover:bg-primary/5 transition-colors"
                    aria-label={`Appeler ${site.nom}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Orientation + Carte ── */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto border-t border-gray-100 pt-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Besoin d&apos;une orientation ?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-8">
              Nos conseillers d&apos;orientation sont disponibles pour vous. Contactez le{" "}
              <span className="font-semibold text-gray-900">+229 01 49 76 16 35</span> pour être
              pris(e) en charge.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="tel:+2290149761635"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors shadow-sm"
              >
                Prendre Rendez-vous
              </a>
              <a
                href="/brochure-gsr.pdf"
                download
                className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-lg font-semibold text-sm hover:bg-primary/5 transition-colors"
              >
                Télécharger notre Brochure
              </a>
            </div>
          </div>

          <CarteSites />
        </div>
      </section>
    </div>
  );
}
