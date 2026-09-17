"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Search, X, Check, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { enregistrerPaiement, enregistrerPaiementMultiMois, consulterResteAPayer } from "@/actions/paiements";
import { MOIS_SCOLAIRES, MODES_PAIEMENT, MODE_PAIEMENT_LABELS, type MoisScolaire, type ModePaiement } from "@/lib/constants";
import { moisCourant, genererNumeroQuittance } from "@/lib/paiements";
import { cn } from "@/lib/utils";
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

  const [formType, setFormType] = useState<"unitaire" | "multi_mois">("unitaire");
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);
  const [eleve, setEleve] = useState<EleveResultat | null>(null);

  const moisDefaut = moisCourant(new Date()) ?? MOIS_SCOLAIRES[0];
  const [mois, setMois] = useState<MoisScolaire>(moisDefaut);
  const [moisMulti, setMoisMulti] = useState<MoisScolaire[]>([
    MOIS_SCOLAIRES[0],
    MOIS_SCOLAIRES[1],
    MOIS_SCOLAIRES[2],
  ]);
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<ModePaiement>("Presentiel");
  const [quittance, setQuittance] = useState<QuittanceData | null>(null);
  const [messageMultiSucces, setMessageMultiSucces] = useState<string | null>(null);

  const [infoReste, setInfoReste] = useState<{
    dejaPaye: number;
    resteAPayer: number;
    montantAttendu: number;
    estExonere?: boolean;
    motifExoneration?: string;
  } | null>(null);
  const [chargementReste, setChargementReste] = useState(false);

  useEffect(() => {
    if (!eleve || !mois) {
      setInfoReste(null);
      return;
    }
    let actif = true;
    setChargementReste(true);
    consulterResteAPayer(eleve.id, mois)
      .then((res) => {
        if (!actif) return;
        if (res.data) {
          setInfoReste({
            dejaPaye: res.data.dejaPaye,
            resteAPayer: res.data.resteAPayer,
            montantAttendu: res.data.montantAttendu,
            estExonere: res.data.estExonere,
            motifExoneration: res.data.motifExoneration,
          });
        } else {
          setInfoReste(null);
        }
      })
      .catch(() => {
        if (actif) setInfoReste(null);
      })
      .finally(() => {
        if (actif) setChargementReste(false);
      });
    return () => {
      actif = false;
    };
  }, [eleve?.id, mois]);

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
    setMessageMultiSucces(null);
  }

  function toggleMoisMulti(m: MoisScolaire) {
    if (moisMulti.includes(m)) {
      setMoisMulti(moisMulti.filter((item) => item !== m));
    } else {
      const nouveau = [...moisMulti, m].sort(
        (a, b) => MOIS_SCOLAIRES.indexOf(a) - MOIS_SCOLAIRES.indexOf(b)
      );
      setMoisMulti(nouveau);
    }
  }

  function appliquerPresetMulti(nombre: number) {
    setMoisMulti(MOIS_SCOLAIRES.slice(0, nombre));
  }

  const montantMensuelClasse = infoReste?.montantAttendu ?? 0;
  const totalMultiAPayer = montantMensuelClasse * moisMulti.length;

  // Calcul prévisionnel des mois offerts en multi-mois
  const nbMoisPayes = moisMulti.length;
  let previsualisationOfferts: string[] = [];
  if (nbMoisPayes === 3 || nbMoisPayes === 6) {
    const dernierMoisIndex = MOIS_SCOLAIRES.indexOf(moisMulti[moisMulti.length - 1]);
    const nbOfferts = nbMoisPayes === 6 ? 2 : 1;
    for (let i = 1; i <= nbOfferts; i++) {
      const nextIdx = dernierMoisIndex + i;
      if (nextIdx < MOIS_SCOLAIRES.length) {
        previsualisationOfferts.push(MOIS_SCOLAIRES[nextIdx]);
      }
    }
  }

  function handleSubmitUnitaire(e: React.FormEvent) {
    e.preventDefault();
    if (!eleve || !montant) return;

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
        const numeroQuittance = genererNumeroQuittance(
          result.anneeLibelle ?? new Date().getFullYear(),
          mois,
          result.lastPaiementId ?? 1
        );
        setQuittance({
          numeroQuittance,
          nomComplet: `${eleve.nom} ${eleve.prenoms}`,
          matricule: eleve.matricule,
          college: result.college ?? "",
          nomClasse: eleve.classes?.nom_classe ?? "—",
          nomSite: eleve.classes?.sites?.nom_site ?? "—",
          mois,
          anneeScolaire: result.anneeLibelle ?? "2025-2026",
          montantAttendu: result.montantAttendu,
          datePaiement: date,
          modePaiement: MODE_PAIEMENT_LABELS[mode],
          versements: result.versements ?? [
            {
              datePaiement: date,
              montantPaye: Number(montant),
              modePaiement: MODE_PAIEMENT_LABELS[mode],
            },
          ],
        });
      }

      setEleve(null);
      setMontant("");
      setInfoReste(null);
      router.refresh();
    });
  }

  function handleSubmitMulti(e: React.FormEvent) {
    e.preventDefault();
    if (!eleve || moisMulti.length === 0) return;

    startTransition(async () => {
      const res = await enregistrerPaiementMultiMois({
        eleveId: eleve.id,
        moisPayes: moisMulti,
        datePaiement: date,
        modePaiement: mode,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message ?? "Paiement multi-mois enregistré avec succès.");
      setMessageMultiSucces(res.message ?? "Paiement enregistré.");
      setEleve(null);
      setInfoReste(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-2xl">
      {/* Sélecteur de mode : Unitaire vs Multi-mois */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setFormType("unitaire")}
          className={cn(
            "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition",
            formType === "unitaire"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          Paiement unitaire
        </button>
        <button
          type="button"
          onClick={() => setFormType("multi_mois")}
          className={cn(
            "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5",
            formType === "multi_mois"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          
          <span>Paiement multi-mois</span>
        </button>
      </div>

      <div>
        <Label>Élève</Label>
        {eleve ? (
          <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-sm">
              <span className="font-medium">
                {eleve.nom} {eleve.prenoms}
              </span>{" "}
              <span className="text-gray-400 font-mono text-xs">{eleve.matricule}</span>
              <div className="text-xs text-gray-500">
                {eleve.classes?.nom_classe} — {eleve.classes?.sites?.nom_site}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEleve(null)}
              className="text-gray-400 hover:text-gray-600"
            >
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
                    <span className="font-medium">
                      {r.nom} {r.prenoms}
                    </span>{" "}
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

      {formType === "unitaire" ? (
        <form onSubmit={handleSubmitUnitaire} className="space-y-5">
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

          {eleve && (
            <div>
              {chargementReste ? (
                <p className="text-xs text-gray-400 italic">Vérification du solde...</p>
              ) : infoReste ? (
                infoReste.estExonere ? (
                  <div className="text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-lg border bg-blue-50 border-blue-200 text-blue-900">
                    Ce mois est exonéré ({infoReste.motifExoneration || "dispense active"}). Aucun paiement requis.
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg border flex items-center justify-between",
                      infoReste.resteAPayer === 0
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    )}
                  >
                    <span>Déjà payé : {infoReste.dejaPaye.toLocaleString("fr-FR")} F</span>
                    <span className="opacity-40">|</span>
                    <span>Reste à payer : {infoReste.resteAPayer.toLocaleString("fr-FR")} F</span>
                  </div>
                )
              ) : null}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="montant">Montant payé (F)</Label>
              <Input
                id="montant"
                type="number"
                min={1}
                required
                disabled={infoReste?.estExonere}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date">Date du paiement</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={isPending || !eleve || !montant || infoReste?.estExonere}>
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
      ) : (
        <form onSubmit={handleSubmitMulti} className="space-y-5">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-800">
                Sélectionnez les mois consécutifs ({moisMulti.length} mois sélectionnés)
              </div>
              {/* <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => appliquerPresetMulti(3)}
                  className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700"
                >
                  3 mois (Oct-Déc)
                </button>
                <button
                  type="button"
                  onClick={() => appliquerPresetMulti(6)}
                  className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700"
                >
                  6 mois (Oct-Mar)
                </button>
              </div> */}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {MOIS_SCOLAIRES.map((m) => {
                const checked = moisMulti.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMoisMulti(m)}
                    className={cn(
                      "px-2.5 py-2 text-xs font-medium rounded-lg border text-center transition flex items-center justify-center gap-1",
                      checked
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {checked && <Check className="w-3 h-3" />}
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bannière de l'offre promotionnelle */}
          {previsualisationOfferts.length > 0 && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-700" />
                <span>
                  {nbMoisPayes === 6
                    ? "Offre 6 mois appliquable : 2 mois offerts"
                    : "Offre 3 mois appliquable : 1 mois offert"}
                </span>
              </div>
              <p>
                Règlement comptant à 100% le jour même : le(s) mois de{" "}
                <strong>{previsualisationOfferts.join(" et ")}</strong> sera/seront automatiquement offert(s) et
                exonéré(s).
                {nbMoisPayes === 6 && " L'année scolaire entière (8 mois) sera ainsi soldée."}
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="dateMulti">Date du paiement</Label>
              <Input id="dateMulti" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {montantMensuelClasse > 0 && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Tarif : {montantMensuelClasse.toLocaleString("fr-FR")} F × {moisMulti.length} mois
              </span>
              <span className="font-bold text-gray-900">
                Total comptant : {totalMultiAPayer.toLocaleString("fr-FR")} F
              </span>
            </div>
          )}

          <Button type="submit" disabled={isPending || !eleve || moisMulti.length === 0}>
            {isPending ? "Traitement..." : `Encaisser comptant (${totalMultiAPayer.toLocaleString("fr-FR")} F)`}
          </Button>

          {messageMultiSucces && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
              {messageMultiSucces}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
