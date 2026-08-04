/* eslint-disable jsx-a11y/alt-text -- Image ici vient de @react-pdf/renderer (PDF), pas du DOM ; ce composant n'a pas de prop alt. */
import path from "path";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

/**
 * Contenu réel du site (accueil, prestations, sites, tarifs, footer) — rien
 * d'inventé. Rendu uniquement côté Node (scripts/generate-brochure.ts), donc
 * les chemins d'images sont des chemins fichier absolus, pas des URLs.
 */
const IMG = path.join(process.cwd(), "public/images");
const LOGO = path.join(process.cwd(), "public/logo.png");

const COULEURS = {
  vertFonce: "#05330f",
  vert: "#0a5c10",
  vertPrimaire: "#12AA00",
  or: "#f6b40a",
  encre: "#1f2a24",
  gris: "#6b7280",
  grisClair: "#e5e7eb",
  surface: "#f7f9fb",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", color: COULEURS.encre },

  // ── Page 1 — Couverture ──
  coverPhoto: { width: "100%", height: 300, objectFit: "cover" },
  coverBlock: { flex: 1, backgroundColor: COULEURS.vertFonce, padding: 32, justifyContent: "space-between" },
  coverBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  coverLogo: { width: 30, height: 30, objectFit: "contain" },
  coverTitle: { color: "#ffffff", fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 18, lineHeight: 1.3 },
  coverTagline: { color: COULEURS.or, fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 10 },
  coverFooter: { color: "rgba(255,255,255,0.7)", fontSize: 9 },

  // ── Commun contenu ──
  content: { padding: 32 },
  kicker: { color: COULEURS.or, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  titre: { fontSize: 17, fontFamily: "Helvetica-Bold", color: COULEURS.vertFonce, marginTop: 6, marginBottom: 18, lineHeight: 1.3 },
  bannerPhoto: { width: "100%", height: 110, objectFit: "cover", borderRadius: 6, marginBottom: 20 },

  // ── Page 2 — Prestations ──
  prestation: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COULEURS.grisClair },
  prestationTitre: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: COULEURS.encre, marginBottom: 5 },
  prestationTexte: { fontSize: 9, color: COULEURS.gris, lineHeight: 1.5 },
  noteBas: { fontSize: 8.5, color: COULEURS.gris, marginTop: 16, fontFamily: "Helvetica-Oblique" },

  // ── Page 3 — Sites ──
  site: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COULEURS.grisClair },
  siteEntete: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  siteNom: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COULEURS.encre },
  siteBadge: {
    marginLeft: 8,
    backgroundColor: COULEURS.vertPrimaire,
    color: "#ffffff",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  siteLigne: { fontSize: 8.5, color: COULEURS.gris, marginTop: 2 },
  tarifsBox: { marginTop: 18, backgroundColor: "#fdf6e3", borderWidth: 1, borderColor: "#f3e0ad", borderRadius: 6, padding: 14 },
  tarifsTitre: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COULEURS.vertFonce, marginBottom: 5 },
  tarifsTexte: { fontSize: 8.5, color: COULEURS.encre, lineHeight: 1.5 },

  // ── Page 4 — Contact ──
  contactPage: { flex: 1, backgroundColor: COULEURS.vertFonce, padding: 32, justifyContent: "center" },
  contactTitre: { color: COULEURS.or, fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 24, textAlign: "center" },
  contactLigne: { color: "#ffffff", fontSize: 10, textAlign: "center", marginBottom: 10 },
  contactCta: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  contactCtaTexte: { color: "#ffffff", fontSize: 9, textAlign: "center", lineHeight: 1.5 },
  copyright: { color: "rgba(255,255,255,0.5)", fontSize: 8, textAlign: "center", marginTop: 28 },
});

export function BrochurePDF({ annee }: { annee: number }) {
  return (
    <Document title="Brochure — Groupe Secret de la Réussite" author="Groupe Secret de la Réussite">
      {/* ── Page 1 — Couverture ── */}
      <Page size="A5" style={styles.page}>
        <Image src={path.join(IMG, "imgC.jpg")} style={styles.coverPhoto} />
        <View style={styles.coverBlock}>
          <View>
            <View style={styles.coverBadge}>
              <Image src={LOGO} style={styles.coverLogo} />
            </View>
            <Text style={styles.coverTitle}>GROUPE SECRET{"\n"}DE LA RÉUSSITE</Text>
            <Text style={styles.coverTagline}>L&apos;excellence scolaire, notre engagement !</Text>
          </View>
          <Text style={styles.coverFooter}>Cotonou, Bénin — 3 sites d&apos;excellence</Text>
        </View>
      </Page>

      {/* ── Page 2 — Nos prestations ── */}
      <Page size="A5" style={[styles.page, styles.content]}>
        <Text style={styles.kicker}>NOS PRESTATIONS</Text>
        <Text style={styles.titre}>Un accompagnement pensé pour chaque étape de la réussite</Text>

        <Image src={path.join(IMG, "img_cip.jpg")} style={styles.bannerPhoto} />

        <View style={styles.prestation}>
          <Text style={styles.prestationTitre}>Cours Intensifs Préparatoires</Text>
          <Text style={styles.prestationTexte}>
            En vacances, des séances pensées pour corriger les lacunes antérieures et aborder en douceur les
            nouvelles notions : documents de cours et évaluations ciblées à l&apos;appui.
          </Text>
        </View>

        <View style={styles.prestation}>
          <Text style={styles.prestationTitre}>Programme d&apos;Accompagnement Scolaire (T.D)</Text>
          <Text style={styles.prestationTexte}>
            Un suivi régulier et personnalisé de chaque enfant tout au long de l&apos;année scolaire, pour maîtriser
            le programme et exceller dans toutes les matières.
          </Text>
        </View>

        <View style={styles.prestation}>
          <Text style={styles.prestationTitre}>Préparation aux Examens</Text>
          <Text style={styles.prestationTexte}>
            Un entraînement spécifique pour le BEPC et le BAC, avec examens blancs, corrections méthodiques et
            module de développement personnel.
          </Text>
        </View>

        <Text style={styles.noteBas}>Cours particuliers à domicile également disponibles, sur devis.</Text>
      </Page>

      {/* ── Page 3 — Nos sites + tarifs ── */}
      <Page size="A5" style={[styles.page, styles.content]}>
        <Text style={styles.kicker}>NOS SITES</Text>
        <Text style={[styles.titre, { marginBottom: 26 }]}>Trois centres d&apos;excellence à Cotonou</Text>

        <View style={styles.site}>
          <View style={styles.siteEntete}>
            <Text style={styles.siteNom}>Site Jéricho</Text>
            <Text style={styles.siteBadge}>SIÈGE SOCIAL</Text>
          </View>
          <Text style={styles.siteLigne}>EPP Jéricho, Cotonou, Bénin</Text>
          <Text style={styles.siteLigne}>Mercredi · Samedi · Dimanche — +229 01 49 76 16 35</Text>
        </View>

        <View style={styles.site}>
          <Text style={styles.siteNom}>Site Yagbé</Text>
          <Text style={styles.siteLigne}>EPP Yagbé, Akpakpa, Cotonou, Bénin</Text>
          <Text style={styles.siteLigne}>Samedi · Dimanche — +229 01 49 76 16 35</Text>
        </View>

        <View style={styles.site}>
          <Text style={styles.siteNom}>Site Vèdoko</Text>
          <Text style={styles.siteLigne}>EPP Vèdoko, Cotonou, Bénin</Text>
          <Text style={styles.siteLigne}>Samedi · Dimanche — +229 01 49 76 16 35</Text>
        </View>

        <View style={styles.tarifsBox}>
          <Text style={styles.tarifsTitre}>Nos tarifs</Text>
          <Text style={styles.tarifsTexte}>
            À partir de 3 000 F pour les Cours Intensifs Préparatoires et 2 000 F/mois pour le Programme
            d&apos;Accompagnement Scolaire (T.D), selon la classe. 3 mois de T.D payés simultanément offrent un 4ème
            mois gratuit. Grille tarifaire complète auprès de nos conseillers ou sur
            groupe-secretdelareussite.com/tarifs.
          </Text>
        </View>
      </Page>

      {/* ── Page 4 — Contact ── */}
      <Page size="A5" style={styles.page}>
        <View style={styles.contactPage}>
          <View style={[styles.coverBadge, { alignSelf: "center" }]}>
            <Image src={LOGO} style={styles.coverLogo} />
          </View>
          <Text style={styles.contactTitre}>Prêt(e) à nous rejoindre ?</Text>

          <Text style={styles.contactLigne}>+229 01 49 76 16 35</Text>
          <Text style={styles.contactLigne}>+229 01 96 08 40 67</Text>
          <Text style={styles.contactLigne}>contact@groupe-secretdelareussite.com</Text>
          <Text style={styles.contactLigne}>Cotonou, Bénin</Text>

          <View style={styles.contactCta}>
            <Text style={styles.contactCtaTexte}>
              Suivez la scolarité de votre enfant en temps réel sur notre Portail Parents{"\n"}
              groupe-secretdelareussite.com/portail-parents
            </Text>
          </View>

          <Text style={styles.copyright}>© {annee} Groupe Secret de la Réussite. Tous droits réservés.</Text>
        </View>
      </Page>
    </Document>
  );
}
