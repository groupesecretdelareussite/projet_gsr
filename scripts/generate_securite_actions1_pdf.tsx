import React from "react";
import ReactPDF, { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import fs from "fs";

const LOGO_PATH = "/home/uriel_axel_houegbe/Bureau/PROJET_GSR_2/gsr/public/logo.png";
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  // EN-TÊTE
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#12AA00",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 38,
    height: 38,
    objectFit: "contain",
  },
  logoFallback: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#12AA00",
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  headerBrand: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    letterSpacing: 0.3,
  },
  headerSubBrand: {
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#4b5563",
    marginTop: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  badgeUrgence: {
    backgroundColor: "#fee2e2",
    borderWidth: 0.8,
    borderColor: "#ef4444",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  badgeUrgenceText: {
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.8,
    letterSpacing: 0.4,
  },
  docRef: {
    fontSize: 6.5,
    color: "#6b7280",
    marginTop: 3,
  },

  // TITRE DU DOCUMENT
  titleBanner: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.8,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  docMainTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  docSubtitle: {
    fontSize: 7.2,
    fontFamily: "Helvetica",
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },

  // PRÉREQUIS / FICHE DE SYNTHÈSE
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderWidth: 0.8,
    borderColor: "#86efac",
    borderRadius: 5,
    padding: 6,
    marginBottom: 10,
    gap: 8,
    alignItems: "center",
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 7.2,
    fontFamily: "Helvetica",
    color: "#14532d",
    marginTop: 1,
  },

  // SECTIONS
  sectionContainer: {
    marginBottom: 9,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 8.8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginLeft: 4,
  },
  sectionNumber: {
    backgroundColor: "#12AA00",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    width: 14,
    height: 14,
    borderRadius: 7,
    textAlign: "center",
    lineHeight: 14,
  },

  // OPTIONS / CARTES
  card: {
    borderWidth: 0.8,
    borderColor: "#e5e7eb",
    borderRadius: 5,
    padding: 7,
    marginBottom: 6,
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 3,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  cardBadge: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  cardBadgeSuccess: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  cardBadgePrimary: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
  },
  cardBadgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  cardBadgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },

  // ÉTAPES
  stepRow: {
    flexDirection: "row",
    marginTop: 2.5,
    marginBottom: 2.5,
  },
  stepBullet: {
    width: 14,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    fontSize: 7.5,
  },
  stepText: {
    flex: 1,
    fontSize: 7.2,
    lineHeight: 1.3,
    color: "#374151",
  },
  stepStrong: {
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },

  // CODE / SQL SNIPPET
  codeBox: {
    backgroundColor: "#0f172a",
    borderRadius: 4,
    padding: 5,
    marginTop: 3,
    marginBottom: 3,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 6.4,
    color: "#38bdf8",
    lineHeight: 1.25,
  },
  codeComment: {
    color: "#94a3b8",
  },

  // CHAÎNE DE RÉPONSE SCÉNARIO 3
  phaseCard: {
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
    backgroundColor: "#fafafa",
  },
  phaseCard1: {
    borderLeftColor: "#ef4444",
    borderWidth: 0.6,
    borderColor: "#fee2e2",
  },
  phaseCard2: {
    borderLeftColor: "#f59e0b",
    borderWidth: 0.6,
    borderColor: "#fef3c7",
  },
  phaseCard3: {
    borderLeftColor: "#10b981",
    borderWidth: 0.6,
    borderColor: "#d1fae5",
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  phaseTitle: {
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },

  // PIED DE PAGE
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.6,
    borderTopColor: "#e5e7eb",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.5,
    color: "#9ca3af",
  },

  // CHECKLIST FINALE
  checklistCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.8,
    borderColor: "#cbd5e1",
    borderRadius: 5,
    padding: 6,
    marginTop: 4,
  },
  checklistTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1.5,
  },
  checkIcon: {
    fontSize: 7,
    color: "#16a34a",
    fontFamily: "Helvetica-Bold",
  },
  checkText: {
    fontSize: 6.8,
    color: "#334155",
  },
});

export function SecuriteActionsPDF() {
  return (
    <Document title="Sécurité & Reprise d'Activité GSR — Scénarios 2 et 3" author="Groupe Secret de la Réussite">
      {/* ============================================================== */}
      {/* PAGE 1 : PRÉSENTATION & SCÉNARIO 2 (PERTE TOTALE D'ACCÈS)      */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE OFFICIEL */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {HAS_LOGO ? (
              <Image src={LOGO_PATH} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>GSR</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerBrand}>GROUPE SECRET DE LA RÉUSSITE</Text>
              <Text style={styles.headerSubBrand}>Guide Opérationnel de Sécurité & Plan de Continuité (PCA)</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badgeUrgence}>
              <Text style={styles.badgeUrgenceText}>PROCÉDURE D'URGENCE</Text>
            </View>
            <Text style={styles.docRef}>Réf : SEC-ACTIONS-01 · Confidentiel Direction</Text>
          </View>
        </View>

        {/* BANNIÈRE DE TITRE */}
        <View style={styles.titleBanner}>
          <Text style={styles.docMainTitle}>GUIDE D'INTERVENTION EN CAS DE CRISE D'ACCÈS</Text>
          <Text style={styles.docSubtitle}>
            Procédures standardisées de rétablissement du compte Coordonnateur et de restauration des services
          </Text>
        </View>

        {/* PRÉREQUIS OPÉRATIONNEL */}
        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Point d'entrée d'urgence</Text>
            <Text style={styles.infoValue}>Ordinateur avec session Supabase Cloud ouverte</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Instance Supabase Production</Text>
            <Text style={styles.infoValue}>Projet : gedmhgcdhghionubfoih</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Domaine & SMTP Officiels</Text>
            <Text style={styles.infoValue}>LWS · groupe-secretdelareussite.com</Text>
          </View>
        </View>

        {/* SECTION SCÉNARIO 2 */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionTitle}>
              SCÉNARIO 2 : PERTE TOTALE D'ACCÈS (Email inaccessible & Mot de passe perdu)
            </Text>
          </View>
          <Text style={[styles.stepText, { marginBottom: 6, fontStyle: "italic", color: "#6b7280" }]}>
            Contexte : L'application web est verrouillée de l'intérieur. L'équipe légitime ne peut plus recevoir
            d'email de réinitialisation. L'intervention s'effectue hors-bande via le Dashboard Supabase Cloud du client.
          </Text>

          {/* OPTION 1 : RÉINITIALISATION SUR LE COMPTE EXISTANT */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>OPTION A : Réinitialiser directement le compte coordonnateur existant</Text>
              <Text style={[styles.cardBadge, styles.cardBadgeSuccess]}>Recommandée (Zéro impact sur les données)</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>1.</Text>
              <Text style={styles.stepText}>
                Se connecter au Dashboard Supabase de production (<Text style={styles.stepStrong}>gedmhgcdhghionubfoih</Text>)
                puis ouvrir le menu <Text style={styles.stepStrong}>Authentication &gt; Users</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>2.</Text>
              <Text style={styles.stepText}>
                Localiser le compte du coordonnateur dans la liste (recherche par username ou ancien email).
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>3.</Text>
              <Text style={styles.stepText}>
                Cliquer sur les trois points <Text style={styles.stepStrong}>[...]</Text> à droite de la ligne et choisir{" "}
                <Text style={styles.stepStrong}>"Set User Password"</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>4.</Text>
              <Text style={styles.stepText}>
                Saisir un mot de passe robuste (&ge; 12 caractères). Si l'email doit être remplacé par un nouvel email actif
                du groupe, modifier l'email dans le dialogue puis synchroniser la table applicative via le SQL Editor :
              </Text>
            </View>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                <Text style={styles.codeComment}>-- Synchroniser le nouvel email dans la table applicative GSR</Text>{"\n"}
                UPDATE public.users{"\n"}
                SET email = 'direction@groupe-secretdelareussite.com'{"\n"}
                WHERE username = 'admin';
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>5.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Résultat :</Text> Le coordonnateur peut immédiatement se reconnecter sur{" "}
                <Text style={styles.stepStrong}>/admin/login</Text> avec son nom d'utilisateur et le nouveau mot de passe.
              </Text>
            </View>
          </View>

          {/* OPTION 2 : CRÉATION D'UN NOUVEAU COMPTE COORDONNATEUR */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>OPTION B : Créer un nouveau compte coordonnateur d'urgence</Text>
              <Text style={[styles.cardBadge, styles.cardBadgePrimary]}>Alternative propre en cas d'ancien compte corrompu</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>1.</Text>
              <Text style={styles.stepText}>
                Dans <Text style={styles.stepStrong}>Authentication &gt; Users</Text>, cliquer sur le bouton vert{" "}
                <Text style={styles.stepStrong}>"Add user" &gt; "Create user"</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>2.</Text>
              <Text style={styles.stepText}>
                Saisir le nouvel email officiel du groupe, définir son mot de passe initial, et cocher impérativement{" "}
                <Text style={styles.stepStrong}>"Auto Confirm User"</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>3.</Text>
              <Text style={styles.stepText}>
                Copier l'<Text style={styles.stepStrong}>Identifiant UUID</Text> du compte généré (ex:{" "}
                <Text style={styles.stepStrong}>"e4b2a1c0-7f99-4a21-99bc-..."</Text>).
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>4.</Text>
              <Text style={styles.stepText}>
                Ouvrir l'onglet <Text style={styles.stepStrong}>SQL Editor</Text> sur Supabase et exécuter la requête d'enregistrement :
              </Text>
            </View>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                <Text style={styles.codeComment}>-- Associer le compte Auth aux privilèges du rôle Coordonnateur</Text>{"\n"}
                INSERT INTO public.users (id, username, email, role, actif){"\n"}
                VALUES ({"\n"}
                &nbsp;&nbsp;'UUID_COPIE_CI_DESSUS',{"\n"}
                &nbsp;&nbsp;'coord_secours',{"\n"}
                &nbsp;&nbsp;'nouvel_email@groupe-secretdelareussite.com',{"\n"}
                &nbsp;&nbsp;'coordonnateur',{"\n"}
                &nbsp;&nbsp;true{"\n"}
                );
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>5.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Résultat :</Text> Le compte de secours est actif avec 100% des droits coordonnateur.
              </Text>
            </View>
          </View>
        </View>

        {/* PIED DE PAGE 1 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Groupe Secret de la Réussite (GSR) — Guide d'Urgence Sécurité</Text>
          <Text style={styles.footerText}>Page 1 sur 2</Text>
        </View>
      </Page>

      {/* ============================================================== */}
      {/* PAGE 2 : SCÉNARIO 3 (PIRATAGE / CHAÎNE DE RÉPONSE EN 3 ÉTAPES) */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE COMPACT PAGE 2 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {HAS_LOGO ? (
              <Image src={LOGO_PATH} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>GSR</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerBrand}>GROUPE SECRET DE LA RÉUSSITE</Text>
              <Text style={styles.headerSubBrand}>Réponse à Incident Majeur — Protocole Opérationnel en 3 Phases</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.badgeUrgence, { borderColor: "#b91c1c" }]}>
              <Text style={styles.badgeUrgenceText}>COMPROMISSION ACTIVE</Text>
            </View>
            <Text style={styles.docRef}>Réf : SEC-ACTIONS-01 · Fiche Réflexe</Text>
          </View>
        </View>

        {/* SECTION SCÉNARIO 3 */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>3</Text>
            <Text style={styles.sectionTitle}>
              SCÉNARIO 3 : PIRATAGE OU COMPROMISSION MALVEILLANTE DU COMPTE COORDONNATEUR
            </Text>
          </View>
          <Text style={[styles.stepText, { marginBottom: 6, fontStyle: "italic", color: "#6b7280" }]}>
            Les 3 méthodes constituent une séquence chronologique indissociable : Stopper l'attaquant &rarr; Reprendre
            le contrôle &rarr; Restaurer l'intégrité des données scolaires.
          </Text>

          {/* PHASE 1 : ENDIGUEMENT */}
          <View style={[styles.phaseCard, styles.phaseCard1]}>
            <View style={styles.phaseHeader}>
              <Text style={[styles.phaseTitle, { color: "#b91c1c" }]}>
                PHASE 1 : ENDIGUEMENT IMMÉDIAT (Éjection de l'attaquant)
              </Text>
              <Text style={[styles.cardBadge, styles.cardBadgeDanger]}>Priorité Absolue · T0 + 5 min</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#b91c1c" }]}>A.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Changer le mot de passe et l'email immédiatement :</Text> Dans Supabase{" "}
                <Text style={styles.stepStrong}>Authentication &gt; Users</Text>, cliquer sur le compte compromis et forcer un
                nouveau mot de passe inconnu du pirate.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#b91c1c" }]}>B.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Révocation globale de toutes les sessions actives :</Text> L'attaquant peut avoir
                des onglets ouverts avec des cookies JWT encore valides. Pour le déconnecter instantanément, exécuter dans le{" "}
                <Text style={styles.stepStrong}>SQL Editor</Text> :
              </Text>
            </View>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                <Text style={styles.codeComment}>-- Invalider immédiatement tous les tokens et sessions du compte compromis</Text>{"\n"}
                DELETE FROM auth.sessions WHERE user_id = 'UUID_DU_COORDONNATEUR';{"\n"}
                DELETE FROM auth.refresh_tokens WHERE session_id IN ({"\n"}
                &nbsp;&nbsp;SELECT id FROM auth.sessions WHERE user_id = 'UUID_DU_COORDONNATEUR'{"\n"}
                );
              </Text>
            </View>
          </View>

          {/* PHASE 2 : REPRISE EN MAIN */}
          <View style={[styles.phaseCard, styles.phaseCard2]}>
            <View style={styles.phaseHeader}>
              <Text style={[styles.phaseTitle, { color: "#b45309" }]}>
                PHASE 2 : REPRISE EN MAIN &amp; AUDIT DES ACCÈS STAFF
              </Text>
              <Text style={[styles.cardBadge, styles.cardBadgeWarning]}>Nettoyage des Privilèges</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#b45309" }]}>A.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Vérifier l'absence de comptes pirates créés :</Text> Le pirate a pu créer un
                faux compte administrateur secondaire pour garder une porte dérobée (*backdoor*).
              </Text>
            </View>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                <Text style={styles.codeComment}>-- Lister tous les comptes ayant accès à la plateforme</Text>{"\n"}
                SELECT id, username, email, role, actif FROM public.users ORDER BY role;
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#b45309" }]}>B.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Désactiver tout compte suspect :</Text> Exécuter{" "}
                <Text style={styles.stepStrong}>UPDATE public.users SET actif = false WHERE id = '...';</Text>
              </Text>
            </View>
          </View>

          {/* PHASE 3 : RESTAURATION */}
          <View style={[styles.phaseCard, styles.phaseCard3]}>
            <View style={styles.phaseHeader}>
              <Text style={[styles.phaseTitle, { color: "#047857" }]}>
                PHASE 3 : RESTAURATION DES DONNÉES (Sauvegarde saine GitHub Actions)
              </Text>
              <Text style={[styles.cardBadge, styles.cardBadgeSuccess]}>Rétablissement RPO 3h du matin</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#047857" }]}>A.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Localiser la sauvegarde saine :</Text> Ouvrir l'organisation GitHub du client{" "}
                <Text style={styles.stepStrong}>groupesecretdelareussite/projet_gsr</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#047857" }]}>B.</Text>
              <Text style={styles.stepText}>
                Basculer sur la branche <Text style={styles.stepStrong}>backups</Text>. Télécharger le dernier dump SQL chiffré/compressé{" "}
                <Text style={styles.stepStrong}>backups/gsr-YYYY-MM-DD.sql.gz</Text> précédant l'intrusion (généré chaque jour à 3h).
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#047857" }]}>C.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Restaurer dans Supabase :</Text> Décompresser l'archive. Les tables{" "}
                <Text style={styles.stepStrong}>public</Text> (élèves, paiements, présences, notes) et{" "}
                <Text style={styles.stepStrong}>td</Text> sont automatiquement remises à zéro et réinjectées sans corrompre le système.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={[styles.stepBullet, { color: "#047857" }]}>D.</Text>
              <Text style={styles.stepText}>
                <Text style={styles.stepStrong}>Sécurité Auth garantie :</Text> Comme le dump exclut volontairement{" "}
                <Text style={styles.stepStrong}>auth.users</Text>, le hacker ne peut en aucun cas réutiliser ses anciens mots de passe !
                Le coordonnateur recrée simplement les accès sains pour son staff.
              </Text>
            </View>
          </View>

          {/* CHECKLIST FINALE DE SORTIE DE CRISE */}
          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>CHECKLIST DE CLÔTURE DE CRISE</Text>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>[OK]</Text>
              <Text style={styles.checkText}>Sessions pirates invalidées et mot de passe maître modifié.</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>[OK]</Text>
              <Text style={styles.checkText}>Intégrité des tables financières (paiements et remises) vérifiée.</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>[OK]</Text>
              <Text style={styles.checkText}>Second compte coordonnateur de secours configuré avec mot de passe sous scellé.</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>[OK]</Text>
              <Text style={styles.checkText}>Information des chefs de site et reprise normale des encaissements et appels.</Text>
            </View>
          </View>
        </View>

        {/* PIED DE PAGE 2 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Groupe Secret de la Réussite (GSR) — Guide d'Urgence Sécurité</Text>
          <Text style={styles.footerText}>Page 2 sur 2</Text>
        </View>
      </Page>
    </Document>
  );
}

async function main() {
  const target1 = "/home/uriel_axel_houegbe/Bureau/PROJET_GSR_2/Sécurité_Actions1.pdf";
  const target2 = "/home/uriel_axel_houegbe/Bureau/PROJET_GSR_2/gsr/Sécurité_Actions1.pdf";

  console.log(`Génération du PDF vers : ${target1}`);
  await ReactPDF.renderToFile(<SecuriteActionsPDF />, target1);
  console.log("Cible 1 générée avec succès !");

  console.log(`Copie miroir vers : ${target2}`);
  fs.copyFileSync(target1, target2);
  console.log("Cible 2 copiée avec succès !");
}

main().catch((err) => {
  console.error("Erreur génération PDF :", err);
  process.exit(1);
});
