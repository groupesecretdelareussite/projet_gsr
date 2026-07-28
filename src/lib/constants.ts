export const ROLES = [
  "coordonnateur",
  "comptable",
  "superviseur",
  "chef_site",
  "secretaire",
] as const;
export type UserRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  coordonnateur: "Coordonnateur",
  comptable: "Comptable",
  superviseur: "Superviseur",
  chef_site: "Chef de site",
  secretaire: "Secrétaire",
};

export const MOIS_SCOLAIRES = [
  "Octobre",
  "Novembre",
  "Decembre",
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
] as const;
export type MoisScolaire = (typeof MOIS_SCOLAIRES)[number];

export const RAISONS_SUSPENSION_MANUELLE = ["maladie", "renvoi", "autre"] as const;
export type RaisonSuspensionManuelle = (typeof RAISONS_SUSPENSION_MANUELLE)[number];

export const RAISON_LABELS: Record<"maladie" | "renvoi" | "defaut_paiement" | "autre", string> = {
  maladie: "Maladie",
  renvoi: "Renvoi",
  defaut_paiement: "Défaut de paiement",
  autre: "Autre",
};

export const OPTIONS_M = Array.from({ length: 20 }, (_, i) => `M${i + 1}`);

export const MODES_PAIEMENT = ["MoMo", "Presentiel"] as const;
export type ModePaiement = (typeof MODES_PAIEMENT)[number];

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  MoMo: "Mobile Money",
  Presentiel: "Présentiel",
};

export const DECISIONS_PASSAGE = ["passe", "redouble", "sortant"] as const;
export type DecisionPassage = (typeof DECISIONS_PASSAGE)[number];
export const DECISION_PASSAGE_LABELS: Record<DecisionPassage, string> = {
  passe: "Passe",
  redouble: "Redouble",
  sortant: "Sortant",
};

export const TYPES_NOTE = ["I1", "I2", "I3", "D1", "D2", "Ctrl"] as const;
export type TypeNote = (typeof TYPES_NOTE)[number];

export const TYPE_NOTE_LABELS: Record<TypeNote, string> = {
  I1: "Interro 1",
  I2: "Interro 2",
  I3: "Interro 3",
  D1: "Devoir 1",
  D2: "Devoir 2",
  Ctrl: "Contrôle",
};
