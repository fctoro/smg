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

    let firstName = "";
    let lastName = "";

    if (id.startsWith("det_")) {
      const rawId = id.replace("det_", "");
      const { data: detData, error: detErr } = await supabase
        .from("detection_registrations")
        .select("prenom, nom")
        .eq("id", rawId)
        .single();
        
      if (detErr || !detData) {
        return NextResponse.json({ isDuplicate: false });
      }
      firstName = detData.prenom?.trim();
      lastName = detData.nom?.trim();
    } else {
      // Fetch the site_message
      const { data: msgRows, error: msgErr } = await supabase
        .from("site_messages")
        .select("payload, type, email")
        .eq("id", id);

      if (msgErr || !msgRows || msgRows.length === 0) {
        return NextResponse.json({ isDuplicate: false });
      }

      const msg = msgRows[0];
      if (msg.type !== "joueur" && msg.type !== "detection") {
        return NextResponse.json({ isDuplicate: false });
      }

      const payload = msg.payload || {};
      firstName = payload.child_first_name?.trim() || payload.prenom?.trim();
      lastName = payload.child_last_name?.trim() || payload.nom?.trim();
    }
    
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
      .ilike("Nom", `%${normalizedLast}%`)
      .or("IsDeleted.eq.0,IsDeleted.is.null");

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
