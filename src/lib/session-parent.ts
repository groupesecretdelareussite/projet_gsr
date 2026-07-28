import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface ParentSessionData {
  matricule?: string;
}

/**
 * §9/§5.2 GSR_ARCHITECTURE.md — session cookie signée, distincte de Supabase
 * Auth (les parents n'ont pas de compte Supabase Auth).
 */
const sessionOptions: SessionOptions = {
  password: process.env.PARENT_SESSION_SECRET!,
  cookieName: "gsr_parent_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1200, // 20 min — durée fixe pour l'instant, pas encore une vraie fenêtre glissante d'inactivité
  },
};

export async function getParentSession(): Promise<IronSession<ParentSessionData>> {
  return getIronSession<ParentSessionData>(cookies(), sessionOptions);
}
