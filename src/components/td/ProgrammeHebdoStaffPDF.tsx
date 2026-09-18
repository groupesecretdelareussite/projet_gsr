import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import path from "path";

export interface LigneCreneauPDF {
  id: number;
  heure: string;
  classe: string;
  matiere: string;
  professeur: string;
  ordreNiveau: number;
}

export interface JourProgrammePDF {
  dateIso: string;
  dateFormatee: string;
  creneaux: LigneCreneauPDF[];
}

export interface ProgrammeHebdoDataPDF {
  nomSite: string;
  libelleSemaine: string;
  dateDebut: string;
  dateFin: string;
  dateGeneration: string;
  nomUtilisateur?: string;
  roleUtilisateur?: string;
  jours: JourProgrammePDF[];
}

const LOGO_PATH = path.join(process.cwd(), "public/logo.png");

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },
  headerBrand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    letterSpacing: 0.5,
  },
  headerDevise: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: "#4b5563",
    marginTop: 2,
  },
  headerRight: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  headerContacts: {
    fontSize: 7.5,
    color: "#6b7280",
  },
  headerDate: {
    fontSize: 7.5,
    color: "#374151",
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  dividerHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#12AA00",
    marginBottom: 8,
  },
  titleBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f4fbf4",
    borderWidth: 1,
    borderColor: "#d1fad7",
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#05330f",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badgeItem: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0a5c10",
  },
  // ── Tableau par jour ──
  daySection: {
    marginBottom: 12,
  },
  dayHeader: {
    backgroundColor: "#05330f",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayCount: {
    fontSize: 8,
    color: "#d1fad7",
    fontFamily: "Helvetica",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#12AA00",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: "#0a5c10",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    fontSize: 8.5,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f9fcf9",
  },
  // Strictement les 4 colonnes
  colHeure: {
    width: "18%",
    fontFamily: "Helvetica-Bold",
    color: "#05330f",
  },
  colClasse: {
    width: "20%",
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  colMatiere: {
    width: "24%",
    color: "#374151",
  },
  colProfesseur: {
    width: "38%",
    color: "#111827",
  },
  profNonAssigne: {
    color: "#9ca3af",
    fontFamily: "Helvetica-Oblique",
  },
  emptyNotice: {
    padding: 8,
    textAlign: "center",
    color: "#6b7280",
    fontFamily: "Helvetica-Oblique",
    fontSize: 8,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderTopWidth: 0,
  },
  // ── Pied de page ──
  footer: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.8,
    borderTopColor: "#e5e7eb",
    paddingTop: 5,
    fontSize: 7.5,
    color: "#9ca3af",
  },
  footerNote: {
    fontFamily: "Helvetica-Oblique",
  },
});

export function ProgrammeHebdoStaffPDF({ data }: { data: ProgrammeHebdoDataPDF }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* EN-TÊTE OFFICIEL */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_PATH} style={styles.logo} />
            <View>
              <Text style={styles.headerBrand}>GROUPE SECRET DE LA RÉUSSITE (GSR)</Text>
              <Text style={styles.headerDevise}>Méthode — Rigueur — Discipline</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerContacts}>Tel : +229 01 96 08 40 67 / 01 49 76 16 35</Text>
            <Text style={styles.headerContacts}>Cotonou, République du Bénin</Text>
            <Text style={styles.headerDate}>Édité le {data.dateGeneration}</Text>
          </View>
        </View>

        <View style={styles.dividerHeader} />

        {/* BANDEAU TITRE & MÉTADONNÉES */}
        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>Programme Hebdomadaire des Travaux Dirigés (TD)</Text>
          <View style={styles.metaBadges}>
            <Text style={styles.badgeItem}>Site : {data.nomSite}</Text>
            <Text style={styles.badgeItem}>·</Text>
            <Text style={styles.badgeItem}>Semaine : {data.libelleSemaine}</Text>
          </View>
        </View>

        {/* UN TABLEAU PAR JOUR */}
        {data.jours.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: "#6b7280", fontStyle: "italic" }}>
              Aucun créneau programmé pour ce site sur la semaine publiée.
            </Text>
          </View>
        ) : (
          data.jours.map((jour) => (
            <View key={jour.dateIso} style={styles.daySection} wrap={false}>
              {/* En-tête du jour */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{jour.dateFormatee}</Text>
                <Text style={styles.dayCount}>
                  {jour.creneaux.length} séance{jour.creneaux.length > 1 ? "s" : ""}
                </Text>
              </View>

              {/* En-tête du tableau : Strictement les 4 colonnes */}
              <View style={styles.tableHeader}>
                <Text style={styles.colHeure}>HEURE</Text>
                <Text style={styles.colClasse}>CLASSE</Text>
                <Text style={styles.colMatiere}>MATIÈRE</Text>
                <Text style={styles.colProfesseur}>PROFESSEUR ASSIGNÉ (NOM & CONTACT)</Text>
              </View>

              {/* Lignes du tableau */}
              {jour.creneaux.map((c, index) => {
                const isEven = index % 2 === 1;
                const isNonAssigne = !c.professeur || c.professeur.toLowerCase().includes("non");

                return (
                  <View key={c.id} style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}>
                    <Text style={styles.colHeure}>{c.heure}</Text>
                    <Text style={styles.colClasse}>{c.classe}</Text>
                    <Text style={styles.colMatiere}>{c.matiere}</Text>
                    <Text style={[styles.colProfesseur, isNonAssigne ? styles.profNonAssigne : {}]}>
                      {c.professeur}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* PIED DE PAGE */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>
            Document administratif officiel GSR — Réservé au Chef de site et aux coordonnateurs.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
