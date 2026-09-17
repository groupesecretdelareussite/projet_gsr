import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export interface VersementQuittance {
  id?: number;
  datePaiement: string;
  montantPaye: number;
  modePaiement: string;
}

export interface QuittanceData {
  numeroQuittance?: string;
  nomComplet: string;
  matricule: string;
  college?: string;
  nomClasse: string;
  nomSite: string;
  mois: string;
  anneeScolaire?: string;
  montantAttendu: number;
  datePaiement?: string;
  modePaiement?: string;
  versements?: VersementQuittance[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 36,
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
    width: 38,
    height: 38,
    objectFit: "contain",
  },
  headerBrand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    letterSpacing: 0.5,
  },
  headerDevise: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#4b5563",
    marginTop: 2,
  },
  headerContacts: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  dividerHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#12AA00",
    marginBottom: 10,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    letterSpacing: 0.8,
  },
  quittanceNum: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#4b5563",
    marginTop: 2,
  },
  cardsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#f9fcf9",
    borderWidth: 1,
    borderColor: "#12AA00",
    borderRadius: 6,
    padding: 8,
  },
  cardTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    borderBottomWidth: 0.8,
    borderBottomColor: "#dcfce7",
    paddingBottom: 4,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  cardValue: {
    fontSize: 8.5,
    color: "#111827",
  },
  montantTotal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    marginTop: 2,
  },
  tableTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#12AA00",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#12AA00",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  tableRowEven: {
    backgroundColor: "#f8faf8",
  },
  colNum: { width: "10%", textAlign: "center" },
  colDate: { width: "35%", textAlign: "center" },
  colMontant: { width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  colMode: { width: "25%", textAlign: "center" },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.8,
    borderTopColor: "#e5e7eb",
  },
  footerNote: {
    width: "60%",
    fontSize: 7.5,
    color: "#6b7280",
    lineHeight: 1.3,
  },
  signatureBlock: {
    width: "35%",
    alignItems: "center",
  },
  signatureTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  signatureRole: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 24,
  },
});

/** §8.7/§12.5 GSR_ARCHITECTURE.md — Quittance PDF enrichie au format paysage avec récapitulatif des versements. */
export function QuittancePDF({ data }: { data: QuittanceData }) {
  const versements =
    data.versements && data.versements.length > 0
      ? data.versements
      : [
          {
            id: 1,
            datePaiement: data.datePaiement ?? new Date().toISOString().slice(0, 10),
            montantPaye: data.montantAttendu,
            modePaiement: data.modePaiement ?? "Présentiel",
          },
        ];

  const dateGeneration = new Date().toLocaleDateString("fr-FR");
  const heureGeneration = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* EN-TÊTE OFFICIEL */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.headerBrand}>GROUPE SECRET DE LA REUSSITE</Text>
              <Text style={styles.headerDevise}>Méthode - Rigueur - Discipline</Text>
            </View>
          </View>
          <View>
            <Text style={styles.headerContacts}>Tel : +229 01 96 08 40 67 / 01 49 76 16 35</Text>
            <Text style={styles.headerContacts}>Cotonou, République du Bénin</Text>
          </View>
        </View>

        <View style={styles.dividerHeader} />

        {/* TITRE QUITTANCE */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>QUITTANCE DE PAIEMENT</Text>
          {data.numeroQuittance && <Text style={styles.quittanceNum}>N° {data.numeroQuittance}</Text>}
        </View>

        {/* CADRES D'INFORMATIONS */}
        <View style={styles.cardsContainer}>
          {/* Cadre Élève */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations de l&apos;Élève</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Nom et Prénoms :</Text>
              <Text style={styles.cardValue}>{data.nomComplet}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Matricule :</Text>
              <Text style={styles.cardValue}>{data.matricule}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Collège :</Text>
              <Text style={styles.cardValue}>{data.college || "—"}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Classe & Site :</Text>
              <Text style={styles.cardValue}>
                {data.nomClasse} — {data.nomSite}
              </Text>
            </View>
          </View>

          {/* Cadre Paiement */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Détails du Paiement</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Mois souscrit :</Text>
              <Text style={styles.cardValue}>{data.mois.toUpperCase()}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Année scolaire :</Text>
              <Text style={styles.cardValue}>{data.anneeScolaire || "2025-2026"}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Total payé :</Text>
              <Text style={styles.montantTotal}>{data.montantAttendu.toLocaleString("fr-FR")} FCFA</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Statut :</Text>
              <Text style={{ ...styles.cardValue, color: "#12AA00", fontFamily: "Helvetica-Bold" }}>
                Mois intégralement soldé
              </Text>
            </View>
          </View>
        </View>

        {/* TABLEAU DES VERSEMENTS */}
        <Text style={styles.tableTitle}>Détail des versements du mois de {data.mois.toUpperCase()}</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colNum}>N°</Text>
          <Text style={styles.colDate}>Date de paiement</Text>
          <Text style={styles.colMontant}>Montant versé</Text>
          <Text style={styles.colMode}>Mode de paiement</Text>
        </View>

        {versements.map((v, index) => {
          const dateStr = v.datePaiement
            ? new Date(v.datePaiement).toLocaleDateString("fr-FR")
            : "—";
          return (
            <View key={v.id ?? index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}>
              <Text style={styles.colNum}>{index + 1}</Text>
              <Text style={styles.colDate}>{dateStr}</Text>
              <Text style={styles.colMontant}>{Number(v.montantPaye).toLocaleString("fr-FR")} F</Text>
              <Text style={styles.colMode}>{v.modePaiement}</Text>
            </View>
          );
        })}

        {/* BAS DE PAGE : NOTE & SIGNATURE */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerNote}>
            Cette quittance atteste du paiement complet des frais de TD pour le mois de {data.mois}{" "}
            {data.anneeScolaire ?? ""}.{"\n"}
            Document officiel généré le {dateGeneration} à {heureGeneration}.
          </Text>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Signature et Cachet</Text>
            <Text style={styles.signatureRole}>Le Coordonnateur</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
