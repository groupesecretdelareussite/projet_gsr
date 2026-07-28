"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { enregistrerPaiement } from "@/actions/paiements";
import { MOIS_SCOLAIRES, MODES_PAIEMENT, MODE_PAIEMENT_LABELS, type MoisScolaire, type ModePaiement } from "@/lib/constants";
import { moisCourant } from "@/lib/paiements";
import type { QuittanceData } from "@/components/admin/paiements/QuittancePDF";

// @react-pdf/renderer pèse ~480 kB — chargé uniquement quand une quittance existe vraiment (mois soldé), jamais au chargement initial du formulaire.
const QuittanceDownloadButton = dynamic(
  () => import("@/components/admin/paiements/QuittanceDownloadButton").then((m) => m.QuittanceDownloadButton),
  { ssr: false, loading: () => <span className="text-xs text-gray-400">Préparation de la quittance...</span> }
);

interface EleveResultat {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EnregistrerPaiementForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);
  const [eleve, setEleve] = useState<EleveResultat | null>(null);

  const moisDefaut = moisCourant(new Date()) ?? MOIS_SCOLAIRES[0];
  const [mois, setMois] = useState<MoisScolaire>(moisDefaut);
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<ModePaiement>("Presentiel");
  const [quittance, setQuittance] = useState<QuittanceData | null>(null);

  function rechercher(q: string) {
    setRecherche(q);
    setEleve(null);
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    fetch(`/api/eleves-recherche?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => setResultats(Array.isArray(data) ? data : []));
  }

  function choisirEleve(e: EleveResultat) {
    setEleve(e);
    setRecherche("");
    setResultats([]);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!eleve) return;

    setQuittance(null);
    startTransition(async () => {
      const result = await enregistrerPaiement({
        eleveId: eleve.id,
        moisSouscription: mois,
        montantPaye: Number(montant),
        datePaiement: date,
        modePaiement: mode,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.resteApresPaiement === 0
          ? `Paiement enregistré — mois de ${mois} soldé`
          : `Paiement enregistré — reste ${result.resteApresPaiement} F pour ${mois}`
      );

      if (result.resteApresPaiement === 0 && result.montantAttendu !== undefined) {
        setQuittance({
          nomComplet: `${eleve.nom} ${eleve.prenoms}`,
          matricule: eleve.matricule,
          nomClasse: eleve.classes?.nom_classe ?? "—",
          nomSite: eleve.classes?.sites?.nom_site ?? "—",
          mois,
          montantAttendu: result.montantAttendu,
          datePaiement: date,
          modePaiement: MODE_PAIEMENT_LABELS[mode],
        });
      }

      setEleve(null);
      setMontant("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-2xl">
      <div>
        <Label>Élève</Label>
        {eleve ? (
          <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-sm">
              <span className="font-medium">{eleve.nom} {eleve.prenoms}</span>{" "}
              <span className="text-gray-400 font-mono text-xs">{eleve.matricule}</span>
              <div className="text-xs text-gray-500">
                {eleve.classes?.nom_classe} — {eleve.classes?.sites?.nom_site}
              </div>
            </div>
            <button type="button" onClick={() => setEleve(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={recherche}
              onChange={(e) => rechercher(e.target.value)}
              placeholder="Rechercher par nom ou matricule…"
              className="pl-9"
            />
            {resultats.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-56 overflow-auto">
                {resultats.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => choisirEleve(r)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                  >
                    <span className="font-medium">{r.nom} {r.prenoms}</span>{" "}
                    <span className="text-gray-400 font-mono text-xs">{r.matricule}</span>
                    <div className="text-xs text-gray-500">
                      {r.classes?.nom_classe} — {r.classes?.sites?.nom_site}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Mois</Label>
          <Select value={mois} onValueChange={(v) => setMois(v as MoisScolaire)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOIS_SCOLAIRES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Mode de paiement</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as ModePaiement)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES_PAIEMENT.map((m) => (
                <SelectItem key={m} value={m}>
                  {MODE_PAIEMENT_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="montant">Montant payé (F)</Label>
          <Input
            id="montant"
            type="number"
            min={1}
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="date">Date du paiement</Label>
          <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={isPending || !eleve || !montant}>
        {isPending ? "Enregistrement..." : "Enregistrer le paiement"}
      </Button>

      {quittance && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-100 rounded-lg">
          <p className="text-sm text-green-700">
            Mois de {quittance.mois} soldé pour {quittance.nomComplet}
          </p>
          <QuittanceDownloadButton data={quittance} />
        </div>
      )}
    </form>
  );
}
