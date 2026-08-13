import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales | GSR",
  description: "Mentions légales du site du Groupe Secret de la Réussite (GSR).",
  alternates: { canonical: "/mentions-legales" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}


const IFU_PLACEHOLDER = "";

export default function MentionsLegalesPage() {
  return (
    <div>
      <div
        className="px-6 py-12 md:py-16"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Mentions légales</h1>
          <p className="text-white/90 text-sm sm:text-base">Éditeur, hébergement et informations légales du site.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
  

        <Section title="Éditeur du site">
          <p>Le présent site est édité par le Groupe Secret de la Réussite (GSR), entreprise individuelle.</p>
          <p>Numéro IFU : {IFU_PLACEHOLDER}</p>
          <p>Adresse : Cotonou, Bénin</p>
          <p>
            Téléphone : +229 01 96 08 40 67 / +229 01 49 76 16 35
            <br />
            Email :{" "}
            <a href="mailto:contact@groupe-secretdelareussite.com" className="text-primary hover:underline">
              contact@groupe-secretdelareussite.com
            </a>
          </p>
          <p>Responsable de la publication : Groupe Secret de la Réussite.</p>
        </Section>

        <Section title="Hébergement">
          <p>
            Le site est hébergé par Vercel Inc. (
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              vercel.com
            </a>
            ).
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L&apos;ensemble des contenus présents sur ce site (textes, images, logo, mise en page) est la propriété du
            Groupe Secret de la Réussite, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou
            partielle, sans autorisation préalable, est interdite.
          </p>
        </Section>

        <Section title="Liens hypertextes">
          <p>
            Ce site peut contenir des liens vers des sites tiers (ex. réseaux sociaux, cartes). Le Groupe Secret de la
            Réussite n&apos;est pas responsable du contenu ou des pratiques de ces sites externes.
          </p>
        </Section>

        <Section title="Données personnelles">
          <p>
            Le site et le portail de gestion associé traitent des données personnelles (élèves, parents, professeurs)
            nécessaires au fonctionnement des services proposés (inscription, suivi scolaire, paiements, portail TD).
          </p>
          <p>
            Pour toute question sur vos données ou pour exercer vos droits, contactez-nous à l&apos;adresse ci-dessus. Une
            politique de confidentialité détaillée sera publiée séparément.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Ce site utilise uniquement des cookies techniques, strictement nécessaires au fonctionnement des espaces
            connectés (administration, portail parents, portail professeurs TD) — pour maintenir une session après
            connexion. Aucun cookie publicitaire ou de mesure d&apos;audience n&apos;est utilisé.
          </p>
        </Section>
      </div>
    </div>
  );
}
