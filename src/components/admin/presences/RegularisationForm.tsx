"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EleveAutocomplete, type EleveResultat } from "@/components/admin/EleveAutocomplete";
import { regulariserPresence, getStatutPresenceDate, type StatutPresenceDate } from "@/actions/presences";
import { formaterDateTd } from "@/lib/date-utils";

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RegularisationForm() {
  const [isPending, startTransition] = useTransition();
  const [eleve, setEleve] = useState<EleveResultat | null>(null);
  const [datePresence, setDatePresence] = useState<string>(aujourdhuiIso());
  const [statutExistant, setStatutExistant] = useState<StatutPresenceDate | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const aujourdhui = aujourdhuiIso();

  useEffect(() => {
    let ignore = false;

    if (!eleve || !datePresence) {
      setStatutExistant(null);
      return;
    }

    setIsChecking(true);
    getStatutPresenceDate(eleve.id, datePresence)
      .then((res) => {
        if (ignore) return;
        if (res.statut) {
          setStatutExistant(res.statut);
        } else {
          setStatutExistant(null);
        }
      })
      .catch(() => {
        if (!ignore) setStatutExistant(null);
      })
      .finally(() => {
        if (!ignore) setIsChecking(false);
      });

    return () => {
      ignore = true;
    };
  }, [eleve, datePresence]);

  function handleRegulariser() {
    if (!eleve || !datePresence) return;
    startTransition(async () => {
      const result = await regulariserPresence({
        eleveId: eleve.id,
        datePresence,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Présence de ${eleve.nom} ${eleve.prenoms} régularisée pour le ${formaterDateTd(datePresence)}`);
      setStatutExistant("present");
    });
  }

  const estDejaPresent = statutExistant === "present";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-xl shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">Régularisation d&apos;une présence</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Pour un élève réinscrit après l&apos;appel du matin ou dont la présence physique a été confirmée
          après coup, sélectionnez l&apos;élève et la date du jour où il était venu.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700">Élève à régulariser</label>
        <EleveAutocomplete eleve={eleve} onChange={setEleve} placeholder="Rechercher l'élève par nom ou matricule…" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          Date de la présence
        </label>
        <Input
          type="date"
          value={datePresence}
          max={aujourdhui}
          onChange={(e) => setDatePresence(e.target.value)}
          className="w-full bg-white text-sm"
        />
        <p className="text-[11px] text-gray-400">
          Vous pouvez choisir n&apos;importe quelle date passée de l&apos;année scolaire en cours.
        </p>
      </div>

      {eleve && datePresence && (
        <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Statut actuel au {formaterDateTd(datePresence)} :</span>
            {isChecking ? (
              <span className="text-gray-400 italic">Vérification...</span>
            ) : statutExistant === "present" ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Déjà Présent
              </Badge>
            ) : statutExistant === "absent" ? (
              <Badge variant="danger" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Marqué Absent
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <HelpCircle className="w-3 h-3" />
                Non enregistré
              </Badge>
            )}
          </div>

          <div className="text-[11px] text-gray-500">
            {isChecking ? null : statutExistant === "present" ? (
              <p className="text-emerald-700">Cet élève est déjà enregistré comme présent pour cette date.</p>
            ) : statutExistant === "absent" ? (
              <p className="text-gray-600">
                L&apos;élève avait été marqué absent lors de l&apos;appel. La validation changera son statut en{" "}
                <span className="font-semibold text-emerald-700">Présent</span>.
              </p>
            ) : (
              <p className="text-gray-600">
                L&apos;élève n&apos;était pas sur la feuille d&apos;appel (ex: suspendu au moment de l&apos;appel). La
                validation créera son enregistrement en{" "}
                <span className="font-semibold text-emerald-700">Présent</span>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button
          onClick={handleRegulariser}
          disabled={!eleve || !datePresence || isPending || isChecking || estDejaPresent}
        >
          {isPending
            ? "Enregistrement..."
            : estDejaPresent
              ? "Déjà marqué présent"
              : "Régulariser en Présent"}
        </Button>
      </div>
    </div>
  );
}
