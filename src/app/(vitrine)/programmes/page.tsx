import type { Metadata } from "next";
import ProgrammesClient from "@/components/vitrine/ProgrammesClient";

export const metadata: Metadata = {
  title: "Nos programmes — Cours intensifs, TD et préparation examens | GSR",
  description:
    "Découvrez nos cours intensifs, notre programme d'accompagnement scolaire (TD) et notre préparation ciblée au BEPC et au BAC.",
  alternates: { canonical: "/programmes" },
  openGraph: {
    title: "Nos programmes — Cours intensifs, TD et préparation examens | GSR",
    description:
      "Cours intensifs, accompagnement scolaire (TD) et préparation ciblée au BEPC et au BAC.",
    url: "/programmes",
  },
};

export default function Page() {
  return <ProgrammesClient />;
}
