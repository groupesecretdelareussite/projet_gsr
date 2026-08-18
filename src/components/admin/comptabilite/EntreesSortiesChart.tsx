"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EntreesSortiesChartProps {
  data: { mois: string; entrees: number; sorties: number }[];
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

/** §11 GSR_ARCHITECTURE.md — toujours sur les 8 mois de l'année sélectionnée, indépendant du filtre "mois". */
export function EntreesSortiesChart({ data }: EntreesSortiesChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Entrées vs Sorties</h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradientEntrees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#12AA00" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#12AA00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientSorties" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mois" tick={{ fontSize: 12 }} tickFormatter={(m) => MOIS_COURTS[m] ?? m} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")}k`} />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString("fr-FR")} F`} />
          <Legend />
          <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#12AA00" strokeWidth={2} fill="url(#gradientEntrees)" />
          <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#dc2626" strokeWidth={2} fill="url(#gradientSorties)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
