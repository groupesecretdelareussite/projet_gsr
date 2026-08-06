import type { MetadataRoute } from "next";

const SITE_URL = "https://groupe-secretdelareussite.com";

/** Seules les pages publiques du vitrine sont indexables — admin/td/portail-parents en sont volontairement absents (voir robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1, frequency: "weekly" as const },
    { path: "/programmes", priority: 0.8, frequency: "monthly" as const },
    { path: "/sites", priority: 0.8, frequency: "monthly" as const },
    { path: "/tarifs", priority: 0.8, frequency: "monthly" as const },
    { path: "/apropos", priority: 0.6, frequency: "monthly" as const },
    { path: "/actualites", priority: 0.7, frequency: "weekly" as const },
    { path: "/galerie", priority: 0.5, frequency: "monthly" as const },
  ];

  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.frequency,
    priority: p.priority,
  }));
}
