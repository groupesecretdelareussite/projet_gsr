import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Grande icône décorative en filigrane, ancrée en bas à droite du bandeau (ex. Tableau de bord). */
  decorativeIcon?: LucideIcon;
}

/** §3.3 GSR_ARCHITECTURE.md — bandeau dégradé vert avec titre + sous-titre. */
export function PageHeader({ title, subtitle, actions, decorativeIcon: DecorativeIcon }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-primary-gradient rounded-2xl px-6 py-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {DecorativeIcon && <DecorativeIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />}
      <div className="relative">
        <h1 className="text-white text-xl sm:text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-white/80 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 relative">{actions}</div>}
    </div>
  );
}
