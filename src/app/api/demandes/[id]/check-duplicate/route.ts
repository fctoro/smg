import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(request: Request, context: any) {
  try {
    const { params } = context;
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    // Fetch the site_message
    const { data: msgRows, error: msgErr } = await supabase
      .from("site_messages")
      .select("metadata, type_message, contact_email")
      .eq("id", id);

    if (msgErr || !msgRows || msgRows.length === 0) {
      return NextResponse.json({ error: "Message non trouve." }, { status: 404 });
    }

    const msg = msgRows[0];
    if (msg.type_message !== "inscription_joueur") {
      return NextResponse.json({ isDuplicate: false });
    }

    let payload = msg.metadata || {};

    const firstName = payload.enfant_prenom?.trim();
    const lastName = payload.enfant_nom?.trim();
    
    if (!firstName || !lastName) {
       return NextResponse.json({ isDuplicate: false });
    }

    const normalizedFirst = firstName.toLowerCase();
    const normalizedLast = lastName.toLowerCase();

    // Check in player_registrations 
    // We check if any registration exists with the same name (case-insensitive approximation)
    // Supabase ilike can be used
    const { data: regRows, error: regErr } = await supabase
      .from("player_registrations")
      .select("id, child_first_name, child_last_name, child_birth_date, created_at")
      .ilike("child_first_name", normalizedFirst)
      .ilike("child_last_name", normalizedLast)
      .order("created_at", { ascending: false });

    if (!regErr && regRows && regRows.length > 1) {
      return NextResponse.json({
        isDuplicate: true,
        source: "player_registrations",
        player: regRows[1] // The older one
      });
    }

    return NextResponse.json({ isDuplicate: false });

  } catch (error: any) {
    console.error("[GET /api/demandes/[id]/check-duplicate]", error);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
