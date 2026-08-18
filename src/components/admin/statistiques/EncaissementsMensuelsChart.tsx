"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface EncaissementsMensuelsChartProps {
  data: { mois: string; montant: number }[];
}

const MOIS_COURTS: Record<string, string> = {
  Octobre: "Oct",
  Novembre: "Nov",
  Décembre: "Déc",
  Janvier: "Jan",
  Février: "Fév",
  Mars: "Mars",
  Avril: "Avr",
  Mai: "Mai",
};

/** §8.8 GSR_ARCHITECTURE.md — toujours sur les 8 mois de l'année sélectionnée, indépendant du filtre "mois" (donne le contexte). */
export function EncaissementsMensuelsChart({ data }: EncaissementsMensuelsChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Encaissements mensuels</h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradientEncaissements" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#12AA00" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#12AA00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mois" tick={{ fontSize: 12 }} tickFormatter={(m) => MOIS_COURTS[m] ?? m} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")}k`} />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString("fr-FR")} F`} />
          <Area type="monotone" dataKey="montant" stroke="#12AA00" strokeWidth={2} fill="url(#gradientEncaissements)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
