import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: any) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { params } = context;
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    // Fetch the site_message
    const { data: msgRows, error: msgErr } = await supabase
      .from("site_messages")
      .select("payload, type, email")
      .eq("id", id);

    if (msgErr || !msgRows || msgRows.length === 0) {
      return NextResponse.json({ isDuplicate: false });
    }

    const msg = msgRows[0];
    if (msg.type !== "joueur") {
      return NextResponse.json({ isDuplicate: false });
    }

    let payload = msg.payload || {};

    const firstName = payload.child_first_name?.trim();
    const lastName = payload.child_last_name?.trim();
    
    if (!firstName || !lastName) {
       return NextResponse.json({ isDuplicate: false });
    }

    const normalizedFirst = firstName.toLowerCase();
    const normalizedLast = lastName.toLowerCase();

    // Check in tblEtudiants
    // We check if any student exists with the same name (case-insensitive approximation)
    const { data: regRows, error: regErr } = await supabase
      .from("tblEtudiants")
      .select("EtudiantID, Nom, Prenom")
      .ilike("Prenom", `%${normalizedFirst}%`)
      .ilike("Nom", `%${normalizedLast}%`);

    if (!regErr && regRows && regRows.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        source: "tblEtudiants",
        player: {
          id: String(regRows[0].EtudiantID),
          child_first_name: regRows[0].Prenom,
          child_last_name: regRows[0].Nom
        }
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
