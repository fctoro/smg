import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function resolveDocumentBytes(doc) {
  if (doc.data && Buffer.isBuffer(doc.data) && doc.data.length > 0) {
    return doc.data;
  }

  if (doc.path) {
    const pathStr = String(doc.path);

    if (/^https?:\/\//i.test(pathStr)) {
      try {
        const response = await fetch(pathStr, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          return Buffer.from(await response.arrayBuffer());
        }
      } catch (e) {
        console.warn(`[resolveDocumentBytes] Could not fetch URL ${pathStr}:`, e.message);
      }
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

      if (supabaseUrl) {
        const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${pathStr.replace(/^\/+/, "")}`;
        try {
          const response = await fetch(publicUrl, { signal: AbortSignal.timeout(10000) });
          if (response.ok) {
            return Buffer.from(await response.arrayBuffer());
          }
        } catch (e) {
          console.warn(`[resolveDocumentBytes] Could not fetch Supabase URL ${publicUrl}:`, e.message);
        }
      }

      try {
        const fullPath = path.join(process.cwd(), "public", pathStr);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
      } catch (e) {
        console.warn(`[resolveDocumentBytes] Could not read local file:`, e.message);
      }
    }
  }

  return null;
}

async function embedImage(pdfDoc, bytes, hintMime) {
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const isPng =
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  if (isJpeg) {
    return pdfDoc.embedJpg(bytes);
  }
  if (isPng) {
    return pdfDoc.embedPng(bytes);
  }

  const mime = (hintMime || "").toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return pdfDoc.embedJpg(bytes);
  }

  return pdfDoc.embedPng(bytes);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    const { data: msgRows, error: msgErr } = await supabase
      .from("site_messages")
      .select("email, created_at")
      .eq("id", id);

    if (msgErr || !msgRows || msgRows.length === 0) {
      return NextResponse.json({ error: "Message non trouve." }, { status: 404 });
    }

    const { email, created_at } = msgRows[0];

    const { data: allRegs, error: regErr } = await supabase
      .from("player_registrations")
      .select("*")
      .eq("guardian_email", email);

    if (regErr || !allRegs || allRegs.length === 0) {
      return NextResponse.json({ error: "Inscription correspondante non trouvee." }, { status: 404 });
    }

    // Find the registration closest in time to the message
    const targetTime = new Date(created_at).getTime();
    let reg = allRegs[0];
    let minDiff = Math.abs(new Date(reg.created_at).getTime() - targetTime);

    for (let i = 1; i < allRegs.length; i++) {
      const diff = Math.abs(new Date(allRegs[i].created_at).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        reg = allRegs[i];
      }
    }

    const { data: docRows, error: docErr } = await supabase
      .from("player_registration_documents")
      .select("*")
      .eq("registration_id", reg.id);

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    try {
      const logoPath = path.join(process.cwd(), "public/images/logo/fc-toro.png");
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logoImage, {
          x: 40,
          y: height - 90,
          width: 50,
          height: 50,
        });
      }
    } catch (error) {
      console.warn("Logo error:", error.message);
    }

    page.drawLine({
      start: { x: 40, y: height - 105 },
      end: { x: width - 40, y: height - 105 },
      thickness: 2,
      color: rgb(0.8, 0.1, 0.1),
    });

    page.drawText("FC TORO - DOSSIER OFFICIEL", {
      x: 105,
      y: height - 55,
      size: 20,
      font: timesBoldFont,
      color: rgb(0.1, 0.1, 0.3),
    });

    page.drawText("FICHE D'INSCRIPTION JOUEUR", {
      x: 105,
      y: height - 75,
      size: 12,
      font: timesBoldFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText("Port-au-Prince, Haiti | contact@fctoro.com", {
      x: 105,
      y: height - 90,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    let playerPhotoDoc = null;
    if (docRows && docRows.length > 0) {
      playerPhotoDoc = docRows.find((doc) => doc.doc_key === "document_photo_id");
    }

    if (playerPhotoDoc) {
      try {
        const photoBytes = await resolveDocumentBytes(playerPhotoDoc);
        if (photoBytes) {
          const photoOffsetY = 40;
          const photoImage = await embedImage(pdfDoc, photoBytes, playerPhotoDoc.content_type);

          page.drawRectangle({
            x: width - 152,
            y: height - 212 - photoOffsetY,
            width: 104,
            height: 124,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });

          page.drawImage(photoImage, {
            x: width - 150,
            y: height - 210 - photoOffsetY,
            width: 100,
            height: 120,
          });
        }
      } catch (error) {
        console.warn("Photo error:", error.message);
      }
    }

    let currentY = height - 140;

    const drawFooter = (targetPage, pageNumber) => {
      targetPage.drawText(
        `Document genere le ${new Date().toLocaleDateString("fr-FR")} - Page ${pageNumber}`,
        {
          x: 40,
          y: 30,
          size: 8,
          font: timesRomanFont,
          color: rgb(0.6, 0.6, 0.6),
        },
      );
    };

    const drawSectionHeader = (title) => {
      if (currentY < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = 800;
        drawFooter(page, pdfDoc.getPageCount());
      }

      page.drawRectangle({
        x: 40,
        y: currentY - 5,
        width: width - 200,
        height: 18,
        color: rgb(0.95, 0.95, 0.98),
      });

      page.drawText(title, {
        x: 45,
        y: currentY,
        size: 11,
        font: timesBoldFont,
        color: rgb(0.1, 0.1, 0.3),
      });

      currentY -= 25;
    };

    const drawFields = (fields) => {
      fields.forEach(([label, value]) => {
        if (currentY < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          currentY = 800;
          drawFooter(page, pdfDoc.getPageCount());
        }

        page.drawText(label, {
          x: 50,
          y: currentY,
          size: 9,
          font: timesBoldFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(String(value || "-"), {
          x: 160,
          y: currentY,
          size: 10,
          font: timesRomanFont,
        });

        currentY -= 14;
      });
    };

    drawSectionHeader("1. IDENTITE DU JOUEUR");
    drawFields([
      ["Nom Complet:", `${reg.child_first_name} ${reg.child_last_name}`],
      ["Date de Naissance:", formatDate(reg.child_birth_date)],
      ["Genre:", reg.child_gender],
      ["Ecole:", reg.child_school],
      ["Programme:", reg.program === "tiToro" ? "Ti Toro (2-5 ans)" : "FC Toro (6-18 ans)"],
      ["Experience Foot:", reg.child_soccer_experience],
      ["Adresse:", reg.child_address],
    ]);

    currentY -= 15;
    drawSectionHeader("2. TUTEUR ET CONTACT D'URGENCE");
    drawFields([
      ["Parent/Tuteur:", reg.guardian_name],
      ["Email Tuteur:", reg.guardian_email],
      ["Telephone Tuteur:", reg.guardian_phone],
      ["Adresse Tuteur:", reg.guardian_address],
      ["Contact Urgence:", reg.emergency_name],
      ["Relation Urgence:", reg.emergency_relation],
      ["Telephone Urgence:", reg.emergency_phone],
    ]);

    currentY -= 15;
    drawSectionHeader("3. LOGISTIQUE ET PAIEMENT");
    drawFields([
      ["Taille Maillot:", reg.uniform_top_size],
      ["Taille Short:", reg.uniform_short_size],
      ["Numero Prefere:", reg.preferred_numbers],
      ["Plan de Paiement:", reg.payment_plan],
      ["Methode:", reg.payment_method],
      ["Signature (Nom):", reg.signature_name],
    ]);

    drawFooter(page, 1);

    if (docRows && docRows.length > 0) {
      for (const doc of docRows) {
        try {
          const fileBytes = await resolveDocumentBytes(doc);
          if (fileBytes) {
            const attachmentPage = pdfDoc.addPage([595.28, 841.89]);
            const pageNumber = pdfDoc.getPageCount();

            const annexLabel =
              doc.doc_key === "document_photo_id"
                ? "PHOTO D'IDENTITE"
                : doc.doc_key.replace(/_/g, " ").toUpperCase();

            attachmentPage.drawText(`ANNEXE : ${annexLabel}`, {
              x: 50,
              y: 800,
              size: 14,
              font: timesBoldFont,
            });

            const attachmentImage = await embedImage(pdfDoc, fileBytes, doc.content_type);

            const maxWidth = 500;
            const maxHeight = 650;
            let drawWidth = attachmentImage.width;
            let drawHeight = attachmentImage.height;
            const ratio = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
            drawWidth *= ratio;
            drawHeight *= ratio;

            attachmentPage.drawImage(attachmentImage, {
              x: (595.28 - drawWidth) / 2,
              y: 841.89 - drawHeight - 100,
              width: drawWidth,
              height: drawHeight,
            });

            drawFooter(attachmentPage, pageNumber);
          }
        } catch (error) {
          console.warn(`Could not embed attachment ${doc.doc_key}:`, error.message);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Dossier_FC_TORO_${reg.child_last_name}.pdf`,
      },
    });
  } catch (error) {
    console.error("[GET /api/demandes/pdf]", error.stack);
    return NextResponse.json(
      {
        error: "Erreur lors de la generation du PDF.",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
