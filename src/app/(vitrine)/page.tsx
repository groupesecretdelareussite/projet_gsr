import type { Metadata } from "next";
import HomeClient from "@/components/vitrine/HomeClient";

export const metadata: Metadata = {
  title: "Groupe Secret de la Réussite — Cours de soutien scolaire au Bénin",
  description:
    "Cours de renfort, préparation BEPC/BAC et accompagnement scolaire à Cotonou (Akpakpa Yagbé, Jéricho, Vèdoko). Résultats prouvés, encadrement personnalisé.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Groupe Secret de la Réussite — Cours de soutien scolaire au Bénin",
    description:
      "Cours de renfort, préparation BEPC/BAC et accompagnement scolaire à Cotonou (Akpakpa Yagbé, Jéricho, Vèdoko).",
    url: "/",
  },
};

export default function Page() {
  return <HomeClient />;
}
