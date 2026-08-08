import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette générique affiché instantanément par les `loading.tsx` (admin,
 * TD coord/prof) pendant qu'une page Server Component va chercher ses
 * données — sans ça, Next.js laisse le navigateur figé sur l'ancienne page
 * jusqu'à ce que la nouvelle soit entièrement prête (pas de retour visuel
 * au clic). Générique plutôt que calqué page par page : mime la forme du
 * bandeau `PageHeader` + une rangée de cartes KPI + quelques lignes, assez
 * proche de la plupart des pages admin (tableaux, dashboards) sans sur-
 * spécialiser pour une seule d'entre elles.
 */
export function PageLoadingSkeleton() {
  return (
    <div>
      <div className="bg-primary-gradient rounded-2xl px-6 py-6 mb-6">
        <Skeleton className="h-6 w-48 bg-white/30" />
        <Skeleton className="h-4 w-64 bg-white/20 mt-2" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
