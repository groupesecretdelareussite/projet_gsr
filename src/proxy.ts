import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ACTIVITY_COOKIE } from "@/lib/admin-activity-cookie";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  // Routes accessibles sans session Supabase Auth : connexion + flux "mot de
  // passe oublié" (demande + lien de confirmation qui pose la session lui-même).
  const isRoutePubliqueAdmin =
    isLoginPage ||
    request.nextUrl.pathname === "/admin/mot-de-passe-oublie" ||
    request.nextUrl.pathname.startsWith("/admin/auth/confirm");

  if (!session && isAdminRoute && !isRoutePubliqueAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/admin/tableau-de-bord", request.url));
  }

  // Portail TD (§5.3) — le coordonnateur réutilise la même session Supabase
  // Auth que /admin. Les professeurs n'ont pas de session Supabase Auth du
  // tout (auth custom bcrypt+cookie, § lib/session-td.ts) : leurs routes
  // /td/prof/* ne sont donc jamais gardées ici, elles se protègent elles-mêmes
  // côté Server Component, comme le portail parents.
  const isTdLoginPage = request.nextUrl.pathname === "/td/login";
  const isTdCoordRoute = request.nextUrl.pathname.startsWith("/td/coord");

  if (!session && isTdCoordRoute) {
    return NextResponse.redirect(new URL("/td/login", request.url));
  }

  if (session && isTdLoginPage) {
    return NextResponse.redirect(new URL("/td/coord/dashboard", request.url));
  }

  // Backstop serveur du timeout d'inactivité (20 min, §5.6). Le watcher JS
  // (AdminInactivityWatcher) rafraîchit ADMIN_ACTIVITY_COOKIE tant qu'il y a
  // une vraie interaction utilisateur ; s'il a expiré alors que la session
  // Supabase est toujours valide (onglet en arrière-plan que le navigateur a
  // throttled/gelé, JS désactivé, etc.), on force la déconnexion ici plutôt
  // que de compter uniquement sur le JS. Partagé /admin + /td/coord car les
  // deux réutilisent la même session. Exempte /admin/reinitialiser-mot-de-passe :
  // sa session est posée par le flux "mot de passe oublié" (code exchange),
  // jamais par login(), donc ce cookie n'y est jamais présent — l'exempter
  // évite de casser ce flux, sans rouvrir l'accès sans session (déjà garanti
  // par la vérification !session && isAdminRoute ci-dessus).
  const isRouteExempteeInactivite =
    isRoutePubliqueAdmin || request.nextUrl.pathname === "/admin/reinitialiser-mot-de-passe";
  const routeProtegeeParInactivite = (isAdminRoute && !isRouteExempteeInactivite) || isTdCoordRoute;

  if (session && routeProtegeeParInactivite && !request.cookies.get(ADMIN_ACTIVITY_COOKIE)) {
    await supabase.auth.signOut();
    const destination = isTdCoordRoute ? "/td/login" : "/admin/login";
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/td/:path*"],
};
