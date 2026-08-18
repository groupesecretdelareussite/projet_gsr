import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle, Trophy, Home, Gift, CalendarClock, Phone, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Tarifs des cours de soutien scolaire | GSR Bénin",
  description:
    "Grille tarifaire transparente pour nos cours de renfort et cours à domicile, de la 6ème à la Terminale.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs des cours de soutien scolaire | GSR Bénin",
    description: "Grille tarifaire transparente, de la 6ème à la Terminale.",
    url: "/tarifs",
  },
};

const CIP_TARIFS = [
  { classes: "6ème et 5ème", montant: "3 500 F" },
  { classes: "4ème et 3ème", montant: "5 000 F" },
  { classes: "2nde et 1ère", montant: "6 000 F" },
  { classes: "Tle", montant: "8 000 F" },
];

const TD_TARIFS = [
  { classes: "6ème et 5ème", montant: "2 500 F" },
  { classes: "4ème", montant: "3 500 F" },
  { classes: "3ème", montant: "5 000 F" },
  { classes: "2nde AB et 2nde CD", montant: "5 000 F" },
  { classes: "1ère B et 1ère CD", montant: "6 000 F" },
  { classes: "Tle B et Tle D", montant: "8 000 F" },
  { classes: "Tle C", montant: "10 000 F" },
];

function TarifTable({ data }: { data: { classes: string; montant: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-3 text-left font-semibold text-gray-600">Classe(s)</th>
            <th className="px-5 py-3 text-right font-semibold text-gray-600">Tarif</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.classes}
              className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
            >
              <td className="px-5 py-3 text-gray-700 font-medium">{row.classes}</td>
              <td className="px-5 py-3 text-right font-bold text-primary">{row.montant}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TarifsPage() {
  return (
    <div>
      {/* ── Hero Header ── */}
      <div
        className="py-16 sm:py-20 px-4"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Nos Tarifs
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            Une grille tarifaire claire pour chacune de nos prestations, adaptée à chaque classe.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {/* ── Cours Intensifs Préparatoires ── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary rounded-full p-2">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Cours Intensifs Préparatoires
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Tarif de la session, par classe.
          </p>
          <TarifTable data={CIP_TARIFS} />
        </section>

        {/* ── Programme d'Accompagnement Scolaire (T.D) ── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-secondary rounded-full p-2">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Programme d&apos;Accompagnement Scolaire (T.D)
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-6 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-secondary shrink-0" />
            Tarif mensuel, à payer au plus tard le 5 de chaque mois.
          </p>
          <TarifTable data={TD_TARIFS} />

          {/* Offre de réduction */}
          <div className="mt-5 flex items-start gap-3 bg-secondary/10 border border-secondary/30 rounded-xl p-5">
            <Gift className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800">
              <span className="font-bold">Offre de réduction :</span> pour le Programme
              d&apos;Accompagnement Scolaire (T.D), 3 mois payés simultanément donnent droit à
              un 4ème mois gratuit.
            </p>
          </div>
        </section>

        {/* ── Préparation aux Examens ── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary rounded-full p-2">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Préparation aux Examens
            </h2>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4">
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Les offres et tarifs de préparation aux examens (BEPC, BAC) sont publiés à
              l&apos;approche des sessions. Consultez notre page Actualités pour ne rien
              manquer.
            </p>
            <Link
              href="/actualites"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
            >
              Voir les actualités <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Cours à domicile ── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-dark rounded-full p-2">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Cours à Domicile
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed max-w-2xl">
            Pour un accompagnement plus rapproché de l&apos;apprenant, nous proposons des
            cours particuliers à domicile au tarif de{" "}
            <span className="font-bold text-gray-900">2 500 F l&apos;heure</span>, discutable
            selon les moyens des parents.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:+2290196084067"
              className="inline-flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-dark/90 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" />
              Appeler MTN
            </a>
            <a
              href="tel:+2290149761635"
              className="inline-flex items-center gap-2 bg-dark text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-dark/90 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" />
              Appeler Celtiis
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
