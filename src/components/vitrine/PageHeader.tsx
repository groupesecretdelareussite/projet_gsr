import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  breadcrumb?: BreadcrumbItem[];
  align?: "left" | "center";
  maxWidth?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  breadcrumb,
  align = "left",
  maxWidth = "max-w-5xl",
}: PageHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className="relative overflow-hidden py-14 sm:py-18 lg:py-20 px-4 sm:px-6 lg:px-8 select-none"
      style={{
        background: "linear-gradient(135deg, #03210c 0%, #064016 40%, #0a561c 75%, #0e7024 100%)",
      }}
    >
      {/* Texture de carroyage millimétré subtil */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />

      {/* Halo lumineux radial vert émeraude doux */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 80% 50%, rgba(18, 170, 0, 0.22) 0%, transparent 60%)",
        }}
      />

      <div className={`${maxWidth} mx-auto relative z-10 ${isCenter ? "text-center" : "text-left"}`}>
        {/* Fil d'Ariane optionnel */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Fil d'Ariane"
            className={`flex items-center gap-1.5 text-xs font-medium text-emerald-200/75 mb-4 ${
              isCenter ? "justify-center" : "justify-start"
            }`}
          >
            <Link href="/" className="hover:text-white transition-colors">
              Accueil
            </Link>
            {breadcrumb.map((item, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 opacity-60" />
                {item.href ? (
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-white font-semibold">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Badge optionnel */}
        {badge && (
          <div className={`mb-3 ${isCenter ? "flex justify-center" : "inline-block"}`}>
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-secondary/15 text-secondary border border-secondary/30">
              {badge}
            </span>
          </div>
        )}

        {/* Titre Principal */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p
            className={`mt-4 text-emerald-100/90 text-sm sm:text-base lg:text-lg leading-relaxed ${
              isCenter ? "max-w-2xl mx-auto" : "max-w-3xl"
            }`}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
