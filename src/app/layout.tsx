import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

const SITE_URL = "https://groupe-secretdelareussite.com";

/**
 * Fallback sitewide (couvre aussi admin/td/portail-parents, jamais indexés —
 * voir robots.ts) ; chaque page vitrine définit son propre title/description
 * qui prend le dessus sur celui-ci.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Groupe Secret de la Réussite",
  description: "L'excellence scolaire, notre engagement",
  openGraph: {
    siteName: "Groupe Secret de la Réussite",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Groupe Secret de la Réussite" }],
  },
  twitter: {
    card: "summary",
    images: ["/logo.png"],
  },
};

/** Données structurées EducationalOrganization (§SEO) — un seul bloc sitewide, Google n'en a besoin que d'une fois. */
const JSON_LD_ORGANISATION = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Groupe Secret de la Réussite",
  alternateName: "GSR",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Cours de renfort, préparation BEPC/BAC et accompagnement scolaire à Cotonou, Bénin.",
  email: "contact@groupe-secretdelareussite.com",
  telephone: "+2290196084067",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cotonou",
    addressCountry: "BJ",
  },
  department: [
    {
      "@type": "EducationalOrganization",
      name: "Site Jéricho",
      address: { "@type": "PostalAddress", streetAddress: "EPP Jéricho", addressLocality: "Cotonou", addressCountry: "BJ" },
    },
    {
      "@type": "EducationalOrganization",
      name: "Site Yagbé",
      address: { "@type": "PostalAddress", streetAddress: "EPP Yagbé, Akpakpa", addressLocality: "Cotonou", addressCountry: "BJ" },
    },
    {
      "@type": "EducationalOrganization",
      name: "Site Vèdoko",
      address: { "@type": "PostalAddress", streetAddress: "EPP Vèdoko", addressLocality: "Cotonou", addressCountry: "BJ" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${lexend.variable} font-sans antialiased text-gray-900 bg-background`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANISATION) }}
        />
        {children}
      </body>
    </html>
  );
}
