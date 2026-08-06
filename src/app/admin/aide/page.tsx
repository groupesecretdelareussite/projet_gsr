import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { NAV_ITEMS } from "@/lib/admin-nav";
import { SECTIONS_AIDE_ADMIN, AIDE_CONNEXION_SECURITE, AIDE_MON_COMPTE } from "@/lib/aide-contenu";

/**
 * Filtre par `NAV_ITEMS` (même source que la Sidebar) plutôt que par une
 * liste de rôles dupliquée ici — impossible que cette page montre à un rôle
 * une fonctionnalité qu'il n'a pas réellement le droit d'utiliser.
 */
export default async function AidePage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  const sectionsVisibles = SECTIONS_AIDE_ADMIN.filter((section) => {
    const item = NAV_ITEMS.find((n) => n.href === section.href);
    return item ? item.roles.includes(scope.role) : false;
  });

  return (
    <div>
      <PageHeader title="Aide" subtitle="Guide d'utilisation, filtré selon ce que votre rôle peut faire ici." />

      <nav className="flex flex-wrap gap-2 mb-6">
        <a href="#connexion-securite" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">
          Connexion &amp; sécurité
        </a>
        {sectionsVisibles.map((s) => (
          <a
            key={s.href}
            href={`#${s.href}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            {s.titre}
          </a>
        ))}
        <a href="#mon-compte" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">
          Mon compte
        </a>
      </nav>

      <div className="space-y-8">
        <section id="connexion-securite" className="scroll-mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Connexion &amp; sécurité</h2>
          {AIDE_CONNEXION_SECURITE}
        </section>

        {sectionsVisibles.map((s) => (
          <section key={s.href} id={s.href} className="scroll-mt-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">{s.titre}</h2>
            <div className="space-y-3">{s.corps}</div>
          </section>
        ))}

        <section id="mon-compte" className="scroll-mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Mon compte</h2>
          {AIDE_MON_COMPTE}
        </section>
      </div>
    </div>
  );
}
