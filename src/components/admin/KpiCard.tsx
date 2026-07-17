import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiTrend {
  /** Variation signée en % (dérive le sens de la flèche — fait brut, pas un jugement). */
  value: number;
  /** Est-ce une bonne nouvelle que ça ait évolué dans ce sens ? (décidé par l'appelant selon le KPI). */
  positive: boolean;
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: KpiTrend;
}

export function KpiCard({ icon: Icon, label, value, trend }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary-gradient flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-full",
              trend.positive ? "text-primary bg-primary/10" : "text-red-600 bg-red-50"
            )}
          >
            {trend.value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(Math.round(trend.value))}% <span className="text-gray-400 font-normal">vs mois dernier</span>
          </div>
        )}
      </div>
    </div>
  );
}
