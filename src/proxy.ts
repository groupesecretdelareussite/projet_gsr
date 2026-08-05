import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/td/:path*"],
};
