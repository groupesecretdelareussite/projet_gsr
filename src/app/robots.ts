import type { MetadataRoute } from "next";

const SITE_URL = "https://groupe-secretdelareussite.com";

/** Empêche l'indexation des portails privés (admin/td/portail-parents) et des routes techniques (api). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/td", "/portail-parents", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
