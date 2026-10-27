import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 28,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  // EN-TÊTE
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#12AA00",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#12AA00",
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  headerBrand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    letterSpacing: 0.3,
  },
  headerSubBrand: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#4b5563",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  badgeConfidentiel: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.5,
  },
  emissionDate: {
    fontSize: 7.5,
    color: "#6b7280",
    marginTop: 4,
  },

  // TITRE & CONSIGNES
  titleBanner: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  docSubtitle: {
    fontSize: 8.2,
    color: "#475569",
    textAlign: "center",
    marginTop: 3,
  },
  userCard: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  userInfo: {
    fontSize: 8,
    color: "#334155",
  },
  userInfoBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },

  // AVERTISSEMENT
  warningBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 6,
    padding: 8,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  warningText: {
    fontSize: 7.5,
    color: "#78350f",
    lineHeight: 1.35,
  },

  // LISTE DES CODES
  codesContainer: {
    gap: 9,
    marginBottom: 18,
  },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.2,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  codeIndexBadge: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: "#cbd5e1",
  },
  codeIndexText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#475569",
  },
  codeNumberText: {
    fontFamily: "Courier-Bold",
    fontSize: 22,
    letterSpacing: 3,
    color: "#0f172a",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkboxSquare: {
    width: 14,
    height: 14,
    borderWidth: 1.2,
    borderColor: "#94a3b8",
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 7.5,
    color: "#64748b",
  },

  // PIED DE PAGE
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    borderTopWidth: 0.8,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },
});

export interface FicheCodesSecoursData {
  username: string;
  roleLabel: string;
  dateEmission: string;
  codes: string[];
}

export function FicheCodesSecoursPDF({ data }: { data: FicheCodesSecoursData }) {
  return (
    <Document title={`Codes de Secours 2FA — ${data.username}`} author="Groupe Secret de la Réussite">
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
              <Text style={styles.headerSubBrand}>Portail Administratif · Double Authentification (2FA)</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badgeConfidentiel}>
              <Text style={styles.badgeText}>STRICTEMENT CONFIDENTIEL</Text>
            </View>
            <Text style={styles.emissionDate}>Émis le {data.dateEmission}</Text>
          </View>
        </View>

        {/* TITRE & IDENTIFICATION */}
        <View style={styles.titleBanner}>
          <Text style={styles.docTitle}>CODES DE SECOURS D&apos;URGENCE (2FA)</Text>
          <Text style={styles.docSubtitle}>
            Clés de déverrouillage uniques en cas de perte, panne ou vol de votre smartphone
          </Text>
          <View style={styles.userCard}>
            <Text style={styles.userInfo}>
              Compte : <Text style={styles.userInfoBold}>{data.username}</Text>
            </Text>
            <Text style={styles.userInfo}>
              Rôle : <Text style={styles.userInfoBold}>{data.roleLabel}</Text>
            </Text>
          </View>
        </View>

        {/* CONSIGNES CRITIQUES */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Consignes de sécurité obligatoires</Text>
          <Text style={styles.warningText}>
            • Chaque code ci-dessous ne peut être utilisé qu&apos;une seule et unique fois pour vous connecter.{"\n"}
            • Dès qu&apos;un code est utilisé, cochez la case correspondante sur cette feuille.{"\n"}
            • Conservez impérativement cette feuille imprimée dans un lieu sécurisé (coffre-fort ou enveloppe scellée).{"\n"}
            • Ne communiquez jamais ces codes par email, téléphone ou messagerie WhatsApp.
          </Text>
        </View>

        {/* LES 5 CODES*/}
        <View style={styles.codesContainer}>
          {data.codes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeIndexBadge}>
                <Text style={styles.codeIndexText}>Code N° {String(index + 1).padStart(2, "0")}</Text>
              </View>
              <Text style={styles.codeNumberText}>{code}</Text>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxSquare} />
                <Text style={styles.checkboxLabel}>Utilisé le : ___ / ___ / _____</Text>
              </View>
            </View>
          ))}
        </View>

        {/* PIED DE PAGE DISCRET */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Groupe Secret de la Réussite (GSR) — Réf : SEC-2FA-BACKUP · Document Confidentiel Personnel
          </Text>
          <Text style={styles.footerText}>Page 1 sur 1</Text>
        </View>
      </Page>
    </Document>
  );
}
