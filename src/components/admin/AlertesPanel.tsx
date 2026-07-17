import Link from "next/link";
import { CheckCircle2, type LucideIcon } from "lucide-react";

export interface Alerte {
  icon: LucideIcon;
  titre: string;
  description: string;
}

interface AlertesPanelProps {
  alertes: Alerte[];
  voirToutHref: string;
}

export function AlertesPanel({ alertes, voirToutHref }: AlertesPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Alertes</h2>
        {alertes.length > 0 && (
          <Link href={voirToutHref} className="text-xs font-semibold text-primary hover:underline">
            Voir tout
          </Link>
        )}
      </div>

      {alertes.length === 0 ? (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-2">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          Aucune alerte pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {alertes.map((alerte, i) => {
            const Icon = alerte.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{alerte.titre}</p>
                  <p className="text-xs text-gray-500">{alerte.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
