"use client";

import { useEffect, useRef } from "react";

const EVENEMENTS_ACTIVITE = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] as const;

/**
 * §5.6 GSR_ARCHITECTURE.md — timeout de session par inactivité (20 min),
 * commun aux 3 portails. Ne fait aucune requête réseau elle-même : ne
 * déclenche que `onTimeout` (déconnexion) après `timeoutMs` sans la moindre
 * interaction utilisateur, et `onActivite` (optionnel — ex. prolonger un
 * cookie de session) au premier signe d'activité après un cycle de silence.
 */
export function InactivityWatcher({
  timeoutMs,
  onTimeout,
  onActivite,
}: {
  timeoutMs: number;
  onTimeout: () => void;
  onActivite?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dernierSignal = useRef(0);
  const onTimeoutRef = useRef(onTimeout);
  const onActiviteRef = useRef(onActivite);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onActiviteRef.current = onActivite;
  });

  useEffect(() => {
    function reinitialiser() {
      const maintenant = Date.now();
      // Ne réveille onActivite qu'au plus une fois par minute, pour éviter
      // une requête serveur à chaque mouvement de souris.
      if (onActiviteRef.current && maintenant - dernierSignal.current > 60_000) {
        dernierSignal.current = maintenant;
        onActiviteRef.current();
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onTimeoutRef.current(), timeoutMs);
    }

    reinitialiser();
    EVENEMENTS_ACTIVITE.forEach((evt) => window.addEventListener(evt, reinitialiser));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENEMENTS_ACTIVITE.forEach((evt) => window.removeEventListener(evt, reinitialiser));
    };
  }, [timeoutMs]);

  return null;
}
