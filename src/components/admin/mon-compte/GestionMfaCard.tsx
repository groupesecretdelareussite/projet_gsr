"use client";

import { useState, useEffect, useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Download,
  KeyRound,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  obtenirStatutMfa,
  initierEnrolementMfa,
  validerEnrolementMfa,
  desactiverMonMfa,
  regenererMesCodesSecours,
} from "@/actions/auth";

export function GestionMfaCard() {
  const [statut, setStatut] = useState<{
    actif: boolean;
    dateActivation?: string;
    codesRestants: number;
  } | null>(null);
  const [chargement, setChargement] = useState(true);

  // Modale Enrôlement
  const [openModalActiver, setOpenModalActiver] = useState(false);
  const [etapeEnrolement, setEtapeEnrolement] = useState<"scan" | "codes">("scan");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [secretText, setSecretText] = useState<string | null>(null);
  const [codeTest, setCodeTest] = useState("");
  const [codesSecoursGeneres, setCodesSecoursGeneres] = useState<string[]>([]);
  const [codesTelecharges, setCodesTelecharges] = useState(false);

  // Modale Désactivation
  const [openModalDesactiver, setOpenModalDesactiver] = useState(false);
  const [mdpDesactivation, setMdpDesactivation] = useState("");

  // Modale Régénération
  const [openModalRegenerer, setOpenModalRegenerer] = useState(false);
  const [mdpRegeneration, setMdpRegeneration] = useState("");
  const [nouveauxCodes, setNouveauxCodes] = useState<string[] | null>(null);

  const [isPending, startTransition] = useTransition();

  async function rafraichirStatut() {
    setChargement(true);
    try {
      const s = await obtenirStatutMfa();
      setStatut(s);
    } catch {
      toast.error("Impossible de charger l'état de sécurité 2FA");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    rafraichirStatut();
  }, []);

  async function demarrerActivation() {
    setErrorEnrolement(null);
    setCodeTest("");
    setEtapeEnrolement("scan");
    setCodesTelecharges(false);

    startTransition(async () => {
      const res = await initierEnrolementMfa();
      if (res.error || !res.factorId || !res.qrCode) {
        toast.error(res.error ?? "Échec d'initialisation 2FA");
        return;
      }
      setFactorId(res.factorId);
      setQrCodeSvg(res.qrCode);
      setSecretText(res.secret ?? null);
      setOpenModalActiver(true);
    });
  }

  const [errorEnrolement, setErrorEnrolement] = useState<string | null>(null);

  function validerCodeInitial(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = codeTest.replace(/\s+/g, "").trim();
    if (!factorId || !cleanCode) return;
    setErrorEnrolement(null);

    startTransition(async () => {
      const res = await validerEnrolementMfa(factorId, cleanCode);
      if (res.error) {
        setErrorEnrolement(res.error);
        return;
      }
      if (res.backupCodes) {
        setCodesSecoursGeneres(res.backupCodes);
        setEtapeEnrolement("codes");
        toast.success("2FA activé avec succès !");
        rafraichirStatut();
        // Téléchargement automatique immédiat de la fiche PDF
        telechargerPdfCodes(res.backupCodes);
      }
    });
  }

  async function telechargerPdfCodes(codes: string[]) {
    try {
      const response = await fetch("/api/auth/mfa/codes-secours-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      if (!response.ok) throw new Error("Échec du téléchargement");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "GSR_Codes_Secours_2FA.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      setCodesTelecharges(true);
      toast.success("Fiche PDF des codes de secours téléchargée");
    } catch {
      toast.error("Erreur lors du téléchargement du PDF");
    }
  }

  function handleDesactiver(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await desactiverMonMfa(mdpDesactivation);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Double authentification désactivée");
      setOpenModalDesactiver(false);
      setMdpDesactivation("");
      rafraichirStatut();
    });
  }

  function handleRegenerer(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await regenererMesCodesSecours(mdpRegeneration);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.backupCodes) {
        setNouveauxCodes(res.backupCodes);
        toast.success("Nouveaux codes générés");
        telechargerPdfCodes(res.backupCodes);
        rafraichirStatut();
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-gray-900 text-base">Double Authentification (2FA)</h2>
        </div>
        {chargement ? (
          <Badge variant="neutral">Vérification...</Badge>
        ) : statut?.actif ? (
          <Badge variant="success">Actif &amp; Protégé</Badge>
        ) : (
          <Badge variant="neutral">Désactivé</Badge>
        )}
      </div>

      <p className="text-gray-500 text-xs leading-relaxed mb-5">
        Protégez votre compte avec Google Authenticator (TOTP). Un code temporaire à 6 chiffres sera
        requis à chaque connexion, rendant votre compte invulnérable au vol de mot de passe seul.
      </p>

      {statut?.actif ? (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-medium">Codes de secours restants :</span>
              <span className="font-bold text-emerald-900 font-mono">
                {statut.codesRestants} / 5 disponibles
              </span>
            </div>
            {statut.codesRestants <= 1 && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0" /> Vos codes de secours sont presque épuisés.
                Régénérez une nouvelle série ci-dessous.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNouveauxCodes(null);
                setMdpRegeneration("");
                setOpenModalRegenerer(true);
              }}
              className="w-full justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Régénérer mes codes de secours
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMdpDesactivation("");
                setOpenModalDesactiver(true);
              }}
              className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Désactiver le 2FA
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={demarrerActivation}
          disabled={chargement || isPending}
          className="w-full justify-center"
        >
          <Smartphone className="w-4 h-4" />
          {isPending ? "Initialisation..." : "Activer Google Authenticator"}
        </Button>
      )}

      {/* ============================================================== */}
      {/* MODALE D'ENRÔLEMENT 2FA                                        */}
      {/* ============================================================== */}
      <Dialog open={openModalActiver} onOpenChange={setOpenModalActiver}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {etapeEnrolement === "scan"
                ? "Configuration de Google Authenticator"
                : "Codes de secours d'urgence (PDF)"}
            </DialogTitle>
            <DialogDescription>
              {etapeEnrolement === "scan"
                ? "Scannez le QR Code avec votre smartphone pour lier votre compte."
                : "Conservez précieusement ces 5 clés uniques en cas de perte de votre téléphone."}
            </DialogDescription>
          </DialogHeader>

          {etapeEnrolement === "scan" ? (
            <form onSubmit={validerCodeInitial}>
              <DialogBody className="space-y-4">
                {/* QR Code SVG */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  {qrCodeSvg ? (
                    <div
                      className="w-44 h-44 bg-white p-2 rounded-lg shadow-xs"
                      dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-gray-400">
                      Chargement du QR Code...
                    </div>
                  )}

                  {secretText && (
                    <div className="mt-3 text-center">
                      <p className="text-[11px] text-gray-400 mb-1">Clé de saisie manuelle :</p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded font-mono text-xs text-gray-800">
                        <span>{secretText}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(secretText);
                            toast.success("Clé secrète copiée !");
                          }}
                          className="text-gray-400 hover:text-primary p-0.5"
                          title="Copier"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {errorEnrolement && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {errorEnrolement}
                  </p>
                )}

                <div>
                  <Label htmlFor="code_test">Code de validation à 6 chiffres</Label>
                  <Input
                    id="code_test"
                    type="text"
                    required
                    maxLength={7}
                    inputMode="numeric"
                    placeholder="123 456"
                    value={codeTest}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      if (digits.length <= 3) {
                        setCodeTest(digits);
                      } else {
                        setCodeTest(`${digits.slice(0, 3)} ${digits.slice(3)}`);
                      }
                    }}
                    className="text-center font-mono text-2xl font-bold tracking-[0.2em] mt-1.5 shadow-inner bg-gray-50/50"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Entrez le code dynamique affiché dans votre application Google Authenticator.
                  </p>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModalActiver(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending || codeTest.replace(/\s+/g, "").length !== 6}>
                  {isPending ? "Validation..." : "Valider et activer"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div>
              <DialogBody className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Votre double authentification est maintenant <strong className="font-bold">active</strong>.
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Vos 5 codes de secours (très grand format) :</p>
                  <div className="bg-gray-900 rounded-xl p-3 text-center space-y-2">
                    {codesSecoursGeneres.map((c, i) => (
                      <div
                        key={i}
                        className="py-1 px-3 bg-gray-800/80 rounded font-mono text-lg sm:text-xl font-bold tracking-widest text-emerald-400 border border-gray-700/50"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => telechargerPdfCodes(codesSecoursGeneres)}
                  className="w-full justify-center gap-2 border-primary text-primary hover:bg-primary/5"
                >
                  <Download className="w-4 h-4" />
                  Télécharger à nouveau la fiche PDF officielle
                </Button>

                <label className="flex items-start gap-2 pt-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codesTelecharges}
                    onChange={(e) => setCodesTelecharges(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <span>
                    J&apos;ai bien téléchargé ou noté mes 5 codes de secours dans un endroit sûr et confidentiel.
                  </span>
                </label>
              </DialogBody>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setOpenModalActiver(false)}
                  disabled={!codesTelecharges}
                >
                  Terminer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODALE DE DÉSACTIVATION 2FA                                    */}
      {/* ============================================================== */}
      <Dialog open={openModalDesactiver} onOpenChange={setOpenModalDesactiver}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Désactiver la double authentification</DialogTitle>
            <DialogDescription>
              Cette action rendra votre compte moins sécurisé. Votre mot de passe actuel est requis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDesactiver}>
            <DialogBody className="space-y-4">
              <div>
                <Label htmlFor="mdp_desactivation">Mot de passe actuel</Label>
                <Input
                  id="mdp_desactivation"
                  type="password"
                  required
                  value={mdpDesactivation}
                  onChange={(e) => setMdpDesactivation(e.target.value)}
                  className="mt-1"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModalDesactiver(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending || !mdpDesactivation}
              >
                {isPending ? "Désactivation..." : "Confirmer la désactivation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODALE DE RÉGÉNÉRATION DES CODES DE SECOURS                   */}
      {/* ============================================================== */}
      <Dialog open={openModalRegenerer} onOpenChange={setOpenModalRegenerer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Régénérer mes codes de secours</DialogTitle>
            <DialogDescription>
              Les anciens codes seront immédiatement révoqués et remplacés par 5 nouveaux codes uniques.
            </DialogDescription>
          </DialogHeader>

          {nouveauxCodes ? (
            <div className="space-y-4 p-6">
              <p className="text-xs font-semibold text-gray-700">Vos 5 nouveaux codes de secours :</p>
              <div className="bg-gray-900 rounded-xl p-3 text-center space-y-2">
                {nouveauxCodes.map((c, i) => (
                  <div
                    key={i}
                    className="py-1 px-3 bg-gray-800/80 rounded font-mono text-lg sm:text-xl font-bold tracking-widest text-emerald-400 border border-gray-700/50"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => telechargerPdfCodes(nouveauxCodes)}
                className="w-full justify-center gap-2 border-primary text-primary hover:bg-primary/5"
              >
                <Download className="w-4 h-4" />
                Télécharger à nouveau la fiche PDF officielle
              </Button>
              <Button type="button" onClick={() => setOpenModalRegenerer(false)} className="w-full">
                Fermer
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegenerer}>
              <DialogBody className="space-y-4">
                <div>
                  <Label htmlFor="mdp_regeneration">Mot de passe actuel</Label>
                  <Input
                    id="mdp_regeneration"
                    type="password"
                    required
                    value={mdpRegeneration}
                    onChange={(e) => setMdpRegeneration(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModalRegenerer(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending || !mdpRegeneration}>
                  {isPending ? "Génération..." : "Générer et télécharger le PDF"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
