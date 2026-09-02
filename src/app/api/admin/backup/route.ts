import { NextRequest, NextResponse } from "next/server";
import { exportFullSystemBackupAction, restoreFullSystemBackupAction } from "@/app/actions/club";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.nextUrl.searchParams.get("email") || undefined;
    const res = await exportFullSystemBackupAction(userEmail);

    if (!res.success || !res.payload) {
      return NextResponse.json(
        { error: res.error || "Impossible de générer le backup" },
        { status: 500 }
      );
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const filename = `backup-fctoro-${dateStr}.json`;

    const jsonString = JSON.stringify(res.payload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("API Backup GET Error:", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await restoreFullSystemBackupAction(body);

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Échec de la restauration" }, { status: 400 });
    }

    return NextResponse.json(res);
  } catch (err: any) {
    console.error("API Backup POST Error:", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
