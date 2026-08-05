import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface TdProfesseurSessionData {
  professeurId?: number;
  nom?: string;
  prenom?: string;
}

/**
 * §5.3 GSR_ARCHITECTURE.md — les professeurs n'ont pas de compte Supabase
 * Auth, session cookie séparée, même mécanique que le portail parents
 * (lib/session-parent.ts) mais complètement indépendante (cookie distinct).
 */
const sessionOptions: SessionOptions = {
  password: process.env.TD_SESSION_SECRET!,
  cookieName: "gsr_td_professeur_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1200, // 20 min — alignée sur les autres portails (§5.6)
  },
};

export async function getTdProfesseurSession(): Promise<IronSession<TdProfesseurSessionData>> {
  return getIronSession<TdProfesseurSessionData>(await cookies(), sessionOptions);
}
