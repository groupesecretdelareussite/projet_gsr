import type { ReactNode } from "react";

/** Petite carte de fonctionnalité — même habillage visuel que les tableaux (`rounded-2xl border border-gray-100`). */
function Carte({ titre, route, children }: { titre: string; route?: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
        <h4 className="font-semibold text-gray-900 text-sm">{titre}</h4>
        {route && <span className="font-mono text-xs text-gray-400">{route}</span>}
      </div>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}

export interface SectionAide {
  /** Doit correspondre au `href` de l'entrée équivalente dans `NAV_ITEMS` (admin-nav.ts) — permet de filtrer l'aide par rôle sans dupliquer la règle d'accès. */
  href: string;
  titre: string;
  corps: ReactNode;
}

export const SECTIONS_AIDE_ADMIN: SectionAide[] = [
  {
    href: "/admin/tableau-de-bord",
    titre: "Tableau de bord",
    corps: (
      <Carte titre="Vue d'ensemble de l'école" route="/admin/tableau-de-bord">
        <p>Première page après connexion. Trois indicateurs (élèves actifs, non à jour, nouveaux ce mois), la répartition des effectifs par classe, et un panneau d&apos;alertes des retards de paiement.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/eleves/liste",
    titre: "Élèves",
    corps: (
      <>
        <Carte titre="Liste des élèves" route="/admin/eleves/liste">
          <p>Recherche et filtres par site/classe. Depuis chaque ligne : modifier la fiche, suspendre, ou réinitialiser le mot de passe du compte parent.</p>
        </Carte>
        <Carte titre="Nouvelle inscription" route="/admin/eleves/inscription">
          <p>Le <strong>matricule</strong> est généré automatiquement et ne change plus jamais ensuite — c&apos;est l&apos;identifiant permanent de l&apos;élève, y compris pour son compte parent.</p>
        </Carte>
        <Carte titre="Élèves suspendus" route="/admin/eleves/suspendus">
          <p>Suspensions actives, avec réinscription possible. La suspension pour retard de paiement se déclenche automatiquement chaque mois, sans action manuelle.</p>
        </Carte>
      </>
    ),
  },
  {
    href: "/admin/notes",
    titre: "Notes",
    corps: (
      <>
        <Carte titre="Saisie" route="/admin/notes">
          <p>Par classe et matière : 3 interros (I1-I3), 2 devoirs (D1-D2). Les notes partielles suffisent pour voir une moyenne s&apos;afficher.</p>
        </Carte>
        <Carte titre="Moyennes" route="/admin/notes/moyennes">
          <p>Moyenne générale pondérée par coefficient (Paramètres → Coefficients). Une matière sans coefficient configuré est signalée et exclue du calcul plutôt que faussée.</p>
        </Carte>
      </>
    ),
  },
  {
    href: "/admin/presences",
    titre: "Présences",
    corps: (
      <Carte titre="Feuille de présence" route="/admin/presences">
        <p>Pointage par classe et par jour, avec export Excel du registre affiché.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/paiements/enregistrer",
    titre: "Paiements",
    corps: (
      <>
        <Carte titre="Enregistrer" route="/admin/paiements/enregistrer">
          <p>Saisie d&apos;un paiement (mois, montant, mode). Une quittance PDF est proposée dès qu&apos;un mois est intégralement soldé.</p>
        </Carte>
        <Carte titre="Historique / À jour / En retard" route="/admin/paiements/historique · a-jour · en-retard">
          <p>Vues filtrables ; la relance WhatsApp depuis « En retard » est journalisée. Un élève qui change de mois sans être à jour est suspendu automatiquement.</p>
        </Carte>
        <Carte titre="Supprimés — Coordonnateur / Comptable uniquement" route="/admin/paiements/supprimes">
          <p>Une suppression exige mot de passe + motif. Le superviseur peut enregistrer des paiements mais jamais en supprimer.</p>
        </Carte>
      </>
    ),
  },
  {
    href: "/admin/statistiques",
    titre: "Statistiques",
    corps: (
      <Carte titre="Statistiques financières" route="/admin/statistiques">
        <p>4 indicateurs (encaissé, nb paiements, paiement moyen, part Mobile Money), courbe mensuelle, répartition par site, taux de recouvrement (année en cours uniquement).</p>
      </Carte>
    ),
  },
  {
    href: "/td/coord/dashboard",
    titre: "Portail TD",
    corps: (
      <>
        <p className="text-sm text-gray-600">Organisation des cours de renfort — clic dans le menu, aucune reconnexion nécessaire.</p>
        <Carte titre="Planning" route="/td/coord/planning">
          <p>Créer une semaine (du lundi au dimanche) puis ses créneaux, n&apos;importe quel jour de cette semaine. Cycle de vie : <strong>Brouillon → Publiée → Clôturée</strong> (irréversible).</p>
        </Carte>
        <Carte titre="Arbitrage" route="/td/coord/arbitrage">
          <p>Quand plusieurs professeurs postulent au même créneau, c&apos;est ici qu&apos;on tranche.</p>
        </Carte>
        <Carte titre="Finance" route="/td/coord/finance">
          <p>Sommes dues par professeur/classe — uniquement les créneaux clôturés et validés.</p>
        </Carte>
        <Carte titre="Configuration" route="/td/coord/config/…">
          <p>Zones, classes, matières, professeurs (désactivation seulement, jamais de suppression).</p>
        </Carte>
      </>
    ),
  },
  {
    href: "/admin/comptabilite",
    titre: "Comptabilité",
    corps: (
      <Carte titre="Comptabilité globale" route="/admin/comptabilite">
        <p>Entrées (paiements élèves) vs sorties (rémunérations TD clôturées/validées + dépenses annexes). Catégories de dépenses personnalisables à la volée.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/fin-annee",
    titre: "Fin d'année",
    corps: (
      <Carte titre="Revue de fin d'année" route="/admin/fin-annee">
        <p>Les classes avec suite automatique reçoivent une décision « passe » par défaut ; les classes en fin de cycle doivent être traitées élève par élève. Rien n&apos;est appliqué sans confirmation explicite (taper « CONFIRMER »).</p>
      </Carte>
    ),
  },
  {
    href: "/admin/notifications",
    titre: "Notifications",
    corps: (
      <Carte titre="Alertes en direct" route="/admin/notifications">
        <p>Cloche en haut de l&apos;écran avec pastille de non-lus. Les événements arrivent en direct, sans recharger la page.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/galerie",
    titre: "Galerie (usage interne)",
    corps: (
      <Carte titre="Archive de fichiers" route="/admin/galerie">
        <p>Stockage privé pour l&apos;équipe, invisible du public. À ne pas confondre avec la galerie du site public, gérée séparément.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/actualites",
    titre: "Actualités",
    corps: (
      <Carte titre="Publier sur le site public" route="/admin/actualites">
        <p>Rédaction et publication des actualités affichées sur le site public, avec galerie multi-images par article.</p>
      </Carte>
    ),
  },
  {
    href: "/admin/parametres/utilisateurs",
    titre: "Paramètres",
    corps: (
      <>
        <Carte titre="Utilisateurs" route="/admin/parametres/utilisateurs">
          <p>Créer/modifier/désactiver un compte du personnel. Jamais de suppression définitive — seulement une désactivation, pour préserver l&apos;historique.</p>
        </Carte>
        <Carte titre="Données scolaires" route="/admin/parametres/donnees-scolaires">
          <p>Sites, classes et tarifs des cours de renfort.</p>
        </Carte>
        <Carte titre="Coefficients" route="/admin/parametres/coefficients">
          <p>Coefficient de chaque matière par classe, utilisé par Notes → Moyennes.</p>
        </Carte>
      </>
    ),
  },
];

/** Toujours affiché, quel que soit le rôle — pas de notion de permission ici. */
export const AIDE_CONNEXION_SECURITE: ReactNode = (
  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1.5">
    <li><strong>Déconnexion automatique</strong> après 20 minutes d&apos;inactivité.</li>
    <li><strong>Blocage anti-intrusion</strong> : 5 tentatives échouées bloquent l&apos;identifiant 15 minutes.</li>
    <li><strong>Mot de passe oublié</strong> : lien de réinitialisation envoyé par email depuis l&apos;écran de connexion.</li>
  </ul>
);

export const AIDE_MON_COMPTE: ReactNode = (
  <p className="text-sm text-gray-600">
    Depuis votre avatar en haut à droite → <strong>Mon compte</strong> : vous pouvez changer votre propre mot de passe à tout moment (l&apos;ancien mot de passe est redemandé par sécurité).
  </p>
);
