"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { enregistrerRelanceWhatsapp } from "@/actions/paiements";
import { genererLienWhatsApp } from "@/lib/whatsapp";
import type { MoisScolaire } from "@/lib/constants";

interface RelancerWhatsAppButtonProps {
  matricule: string;
  nomComplet: string;
  moisSouscription: MoisScolaire;
  montantRestant: number;
  contactParent: string;
}

/** §1.3/§13 GSR_ARCHITECTURE.md — jamais d'envoi automatique : on ouvre wa.me, l'utilisateur clique "Envoyer" lui-même. */
export function RelancerWhatsAppButton({
  matricule,
  nomComplet,
  moisSouscription,
  montantRestant,
  contactParent,
}: RelancerWhatsAppButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const message = `Bonjour, il reste ${montantRestant} F à payer pour ${nomComplet} au titre du mois de ${moisSouscription}. Merci de régulariser dès que possible. — Secret de la Réussite`;
    window.open(genererLienWhatsApp(contactParent, message), "_blank");

    startTransition(async () => {
      await enregistrerRelanceWhatsapp(matricule, moisSouscription, montantRestant, contactParent);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <MessageCircle className="w-3.5 h-3.5" />
      <span className={HOVER_ONLY_LABEL}>Relancer</span>
    </Button>
  );
}
