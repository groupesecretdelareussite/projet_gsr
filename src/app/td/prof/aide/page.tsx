import { PageHeader } from "@/components/admin/PageHeader";
import { AIDE_CONNEXION_SECURITE } from "@/lib/aide-contenu";

/** Contenu propre au professeur TD — audience séparée du portail Admin (session bcrypt/iron-session, pas Supabase Auth), donc pas de filtrage par rôle ici : un professeur voit tout ce qui existe pour lui, rien de plus. */
export default function AideProfesseurPage() {
  return (
    <div>
      <PageHeader title="Aide" subtitle="Comment utiliser le portail TD en tant que professeur." />

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Candidatures</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600 leading-relaxed">
            <p>La liste affiche les créneaux de cours de renfort publiés par le coordonnateur et encore ouverts. Postulez à ceux qui vous conviennent ; vous pouvez retirer une candidature tant qu&apos;elle n&apos;a pas été validée.</p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Tableau de bord</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600 leading-relaxed">
            <p>Vos prochaines interventions confirmées, votre historique, et le cumul de vos rémunérations. Un créneau n&apos;est compté comme dû que lorsque le coordonnateur l&apos;a clôturé et validé côté Finance.</p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-dark mb-3">Connexion &amp; sécurité</h2>
          {AIDE_CONNEXION_SECURITE}
        </section>
      </div>
    </div>
  );
}
