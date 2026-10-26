import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { FicheCodesSecoursPDF } from "@/components/admin/FicheCodesSecoursPDF";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Non authentifié", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Corps de requête invalide", { status: 400 });
  }

  const { codes } = body;
  if (!Array.isArray(codes) || codes.length !== 5) {
    return new NextResponse("5 codes de secours requis", { status: 400 });
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("username, role")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? "Utilisateur";
  const role = (profile?.role ?? "staff") as UserRole;
  const roleLabel = ROLE_LABELS[role] ?? "Staff";

  const maintenant = new Date();
  const dateEmission = maintenant.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const docElement = React.createElement(FicheCodesSecoursPDF, {
    data: {
      username,
      roleLabel,
      dateEmission,
      codes,
    },
  }) as unknown as Parameters<typeof renderToStream>[0];

  const stream = await renderToStream(docElement);
  const nomFichier = `GSR_Codes_Secours_2FA_${username}.pdf`;

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
