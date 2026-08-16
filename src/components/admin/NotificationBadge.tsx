"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { marquerNotificationLue, marquerToutesNotificationsLues } from "@/actions/notifications";

interface Notification {
  id: number;
  contenu: string;
  lu: boolean;
  date_creation: string;
}

function tempsEcoule(dateIso: string): string {
  const secondes = Math.floor((Date.now() - new Date(dateIso).getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

/** §5.8/§8.1 GSR_ARCHITECTURE.md — RLS scope déjà filtré côté serveur, cette table est ajoutée à la publication Realtime (sql/007). */
export function NotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("id, contenu, lu, date_creation")
      .order("date_creation", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data ?? []));

    const channel = supabase
      .channel("notifications-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const nonLues = notifications.filter((n) => !n.lu);

  function marquerLue(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    marquerNotificationLue(id);
  }

  function toutMarquerLu() {
    const ids = nonLues.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    marquerToutesNotificationsLues(ids);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {nonLues.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            {nonLues.length > 0 && (
              <button type="button" onClick={toutMarquerLu} className="text-xs text-primary hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => marquerLue(n.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                    n.lu ? "text-gray-500" : "text-gray-800 bg-primary/5"
                  }`}
                >
                  <p>{n.contenu}</p>
                  <p className="text-xs text-gray-400 mt-1">{tempsEcoule(n.date_creation)}</p>
                </button>
              ))
            )}
          </div>
          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-gray-50 border-t border-gray-100"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
