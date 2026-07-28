import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface QuittanceData {
  nomComplet: string;
  matricule: string;
  nomClasse: string;
  nomSite: string;
  mois: string;
  montantAttendu: number;
  datePaiement: string;
  modePaiement: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { backgroundColor: "#12AA00", padding: 20, borderRadius: 6, marginBottom: 24 },
  headerTitle: { color: "#ffffff", fontSize: 18, fontWeight: 700 },
  headerSubtitle: { color: "#ffffff", fontSize: 10, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  label: { color: "#6b7280" },
  value: { fontWeight: 700 },
  badge: { marginTop: 24, padding: 12, backgroundColor: "#f0fdf4", borderRadius: 6, textAlign: "center" },
  badgeText: { color: "#12AA00", fontWeight: 700, fontSize: 13 },
  footer: { marginTop: 40, fontSize: 9, color: "#9ca3af", textAlign: "center" },
});

/** §8.7/§12.5 GSR_ARCHITECTURE.md — proposée quand un mois est soldé (SUM(montant_paye) >= frais_td.montant). */
export function QuittancePDF({ data }: { data: QuittanceData }) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Groupe Secret de la Réussite</Text>
          <Text style={styles.headerSubtitle}>Quittance de paiement — Frais TD</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Élève</Text>
          <Text style={styles.value}>{data.nomComplet}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Matricule</Text>
          <Text style={styles.value}>{data.matricule}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Classe</Text>
          <Text style={styles.value}>{data.nomClasse} — {data.nomSite}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mois soldé</Text>
          <Text style={styles.value}>{data.mois}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Montant</Text>
          <Text style={styles.value}>{data.montantAttendu.toLocaleString("fr-FR")} F</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(data.datePaiement).toLocaleDateString("fr-FR")}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mode de paiement</Text>
          <Text style={styles.value}>{data.modePaiement}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Mois intégralement soldé</Text>
        </View>

        <Text style={styles.footer}>Document généré automatiquement — Groupe Secret de la Réussite</Text>
      </Page>
    </Document>
  );
}
