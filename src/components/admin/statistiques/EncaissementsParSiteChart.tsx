"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/admin/EmptyState";
import { PieChart } from "lucide-react";

interface EncaissementsParSiteChartProps {
  data: { site: string; montant: number }[];
}

/** §8.8 GSR_ARCHITECTURE.md — respecte tous les filtres actifs, y compris le mois. */
export function EncaissementsParSiteChart({ data }: EncaissementsParSiteChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Encaissements par site</h2>
      {data.length === 0 ? (
        <EmptyState icon={PieChart} title="Aucun encaissement" description="Aucun paiement ne correspond aux filtres actuels." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="site" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")}k`} />
            <Tooltip formatter={(value) => `${Number(value).toLocaleString("fr-FR")} F`} />
            <Bar dataKey="montant" fill="#12AA00" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
