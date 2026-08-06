import type { Metadata } from "next";
import GalerieClient from "@/components/vitrine/GalerieClient";

export const metadata: Metadata = {
  title: "Galerie photos — La vie à GSR en images",
  description:
    "Vie scolaire, activités TD, coaching et examens : découvrez le quotidien de nos élèves en photos.",
  alternates: { canonical: "/galerie" },
  openGraph: {
    title: "Galerie photos — La vie à GSR en images",
    description: "Vie scolaire, activités TD, coaching et examens en photos.",
    url: "/galerie",
  },
};

export default function Page() {
  return <GalerieClient />;
}
