import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const runtime = "nodejs";

// We still need the service role client for some operations that might bypass RLS,
// but we will authenticate the request first.
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
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
    timeZone: "UTC",
  }).format(date);
}

export async function GET(request) {
  try {
    const serverClient = await createServerClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    const { data: msgRows, error: msgErr } = await supabase
      .from("site_messages")
      .select("email, created_at, payload")
      .eq("id", id);

    if (msgErr || !msgRows || msgRows.length === 0) {
      return NextResponse.json({ error: "Message non trouve." }, { status: 404 });
    }

    const { email, created_at, payload: msgPayload } = msgRows[0];

    let reg = null;

    // First: try to use payload.id (registration ID) directly — fastest and most accurate
    const registrationId = msgPayload?.id;
    if (registrationId) {
      const { data: regById } = await supabase
        .from("player_registrations")
        .select("*")
        .eq("id", registrationId)
        .single();
      if (regById) reg = regById;
    }

    // Fallback: search by guardian email if payload.id not available
    if (!reg && email) {
      const { data: allRegs, error: regErr } = await supabase
        .from("player_registrations")
        .select("*")
        .eq("guardian_email", email);

      if (regErr || !allRegs || allRegs.length === 0) {
        return NextResponse.json({ error: "Inscription correspondante non trouvee." }, { status: 404 });
      }

      // Find the registration closest in time to the message
      const targetTime = new Date(created_at).getTime();
      reg = allRegs[0];
      let minDiff = Math.abs(new Date(reg.created_at).getTime() - targetTime);

      for (let i = 1; i < allRegs.length; i++) {
        const diff = Math.abs(new Date(allRegs[i].created_at).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          reg = allRegs[i];
        }
      }
    }

    if (!reg) {
      return NextResponse.json({ error: "Inscription correspondante non trouvee." }, { status: 404 });
    }

    const { data: docRows, error: docErr } = await supabase
      .from("player_registration_documents")
      .select("*")
      .eq("registration_id", reg.id);


    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    let signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    try {
      const fontPath = path.join(process.cwd(), "public/fonts/signature.ttf");
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        signatureFont = await pdfDoc.embedFont(fontBytes);
      }
    } catch (e) {
      console.warn("Could not load custom signature font:", e.message);
    }

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

    page.drawText("7, Rue Rigaud Pétion-Ville,Haïti | footballclubtoro@gmail.com", {
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
      ["Nom Complet:", `${reg.child_first_name || ""} ${reg.child_last_name || ""}`.trim()],
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
    
    const logisticsFields = [
      ["Taille Maillot:", reg.uniform_top_size],
      ["Taille Short:", reg.uniform_short_size],
      ["Numero Prefere:", reg.preferred_numbers],
      ["Plan de Paiement:", reg.payment_plan],
      ["Methode:", reg.payment_method],
    ];

    const uniformMap = {
      uniforme_jeux1: "Jeux 1 (Entrainement)",
      uniforme_jeux2: "Jeux 2 (Match 1)",
      uniforme_jeux3: "Jeux 3 (Match 2)",
      tracksuit: "Tracksuit",
      backpack: "Backpack"
    };

    if (Array.isArray(reg.ordered_uniforms) && reg.ordered_uniforms.length > 0) {
      const items = reg.ordered_uniforms.map(k => uniformMap[k] || k).join(", ");
      logisticsFields.push(["Articles Commandes:", items]);
    }
    
    drawFields(logisticsFields);

    currentY -= 15;
    drawSectionHeader("4. ENGAGEMENT FINANCIER");

    if (currentY < 200) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = 800;
      drawFooter(page, pdfDoc.getPageCount());
    }

    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startSeasonYr = curMonth >= 7 ? curYear : curYear - 1;
    const currentSeasonStr = `${startSeasonYr}-${startSeasonYr + 1}`;

    const engagementText = `Je soussigne(e), parent/personne responsable du joueur inscrit, reconnais avoir pris connaissance de la tarification de la saison ${currentSeasonStr} et du plan de paiement choisi. Je reconnais devoir a FC TORO/Fulmoun Production les montants indiques ci-dessus et m'engage a les regler selon l'echeancier convenu. Tout mois engage est du dans son integralite, meme en cas d'absence, de suspension temporaire ou d'arret de participation non notifie par ecrit avant le debut du mois concerne. Tout retard ou defaut de paiement peut entrainer la suspension de la participation du joueur aux activites, sans annuler les sommes dues. En cas de non-reglement apres relances, le dossier pourra etre transmis au service de recouvrement, conformement aux procedures applicables. Aucun versement deja effectue n'est remboursable, sauf decision exceptionnelle de l'administration.`;

    page.drawText(engagementText, {
      x: 50,
      y: currentY,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: 495,
      lineHeight: 13,
    });
    
    currentY -= 110;

    drawFields([
      ["Nom du responsable:", reg.financial_commitment_name],
      ["Date:", formatDate(reg.financial_commitment_date)],
      ["Telephone:", reg.financial_commitment_phone],
    ]);

    currentY -= 20;
    
    let consentItems = [];
    if (reg.consents?.consent_media) {
      consentItems.push("J'autorise l'utilisation des photos et vidéos de mon enfant sur les réseaux sociaux et sur tout support de communication relatif à FC TORO.");
    }
    if (reg.consents?.consent_health) {
      consentItems.push("Je certifie que mon enfant ne présente aucune contre-indication médicale à la pratique du football.");
    }
    if (reg.consents?.consent_emergency) {
      consentItems.push("Je soussigné(e) autorise les responsables de FC TORO à prendre toutes les dispositions nécessaires en cas d'urgence médicale concernant mon enfant.");
    }

    if (consentItems.length > 0) {
      if (currentY < 180) {
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = 800;
        drawFooter(page, pdfDoc.getPageCount());
      }
      drawSectionHeader("5. AUTORISATIONS & ENGAGEMENT");
      
      for (const item of consentItems) {
        page.drawRectangle({
          x: 50,
          y: currentY + 3,
          width: 8,
          height: 8,
          borderColor: rgb(0.5, 0.5, 0.5),
          borderWidth: 1,
        });
        
        // cross
        page.drawLine({ start: { x: 50, y: currentY + 3 }, end: { x: 58, y: currentY + 11 }, thickness: 1, color: rgb(0,0,0) });
        page.drawLine({ start: { x: 58, y: currentY + 3 }, end: { x: 50, y: currentY + 11 }, thickness: 1, color: rgb(0,0,0) });

        page.drawText(item, {
          x: 65,
          y: currentY,
          size: 9,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
          maxWidth: 480,
          lineHeight: 13,
        });
        
        const linesCount = Math.ceil(item.length / 85);
        currentY -= (linesCount * 13) + 10;
      }
    }

    currentY -= 20;
    const drawSignatureBox = (label, name, x, y, width = 240) => {
      page.drawText(label, {
        x: x,
        y: y,
        size: 10,
        font: timesBoldFont,
        color: rgb(0.1, 0.1, 0.3),
      });

      page.drawRectangle({
        x: x,
        y: y - 55,
        width: width,
        height: 45,
        color: rgb(0.93, 0.96, 1.0),
        borderColor: rgb(0.85, 0.9, 0.95),
        borderWidth: 1,
      });

      page.drawText(name || "Non signee", {
        x: x + 10,
        y: y - 40,
        size: 20,
        font: signatureFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawLine({
        start: { x: x + 5, y: y - 43 },
        end: { x: x + width - 5, y: y - 43 },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.92),
      });
    };

    if (reg.financial_commitment_signature) {
      if (currentY - 60 < 120) {
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = 800;
        drawFooter(page, pdfDoc.getPageCount());
      }
      drawSignatureBox("Signature Engagement Financier :", reg.financial_commitment_signature, 45, currentY, 450);
      currentY -= 75;
    }
    
    if (currentY - 80 < 120) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = 800;
      drawFooter(page, pdfDoc.getPageCount());
    }

    currentY -= 20;
    drawSignatureBox("Signature du Parent / Tuteur :", reg.signature_name, 45, currentY, 450);

    page.drawText(`Fait le : ${formatDate(reg.created_at)}`, {
      x: 45,
      y: currentY - 75,
      size: 10,
      font: timesRomanFont,
    });


    currentY = 160;

    page.drawText("Réservé à l'administration", {
      x: 45,
      y: currentY,
      size: 12,
      font: timesBoldFont,
      color: rgb(0, 0, 0),
    });

    currentY -= 15;
    
    const tableX = 45;
    const tableY = currentY;
    const colWidths = [100, 120, 130, 150];
    const rowHeight = 25;
    
    // Grey backgrounds
    page.drawRectangle({ x: tableX, y: tableY - rowHeight, width: colWidths[0], height: rowHeight, color: rgb(0.92, 0.92, 0.92) });
    page.drawRectangle({ x: tableX + colWidths[0] + colWidths[1], y: tableY - rowHeight, width: colWidths[2], height: rowHeight, color: rgb(0.92, 0.92, 0.92) });
    page.drawRectangle({ x: tableX, y: tableY - 2 * rowHeight, width: colWidths[0], height: rowHeight, color: rgb(0.92, 0.92, 0.92) });
    page.drawRectangle({ x: tableX + colWidths[0] + colWidths[1], y: tableY - 2 * rowHeight, width: colWidths[2], height: rowHeight, color: rgb(0.92, 0.92, 0.92) });

    // Grid lines
    for (let i = 0; i <= 2; i++) { // horizontal
      page.drawLine({ start: { x: tableX, y: tableY - i * rowHeight }, end: { x: tableX + 500, y: tableY - i * rowHeight }, thickness: 1, color: rgb(0, 0, 0) });
    }
    let currentX = tableX;
    for (let i = 0; i <= 4; i++) { // vertical
      page.drawLine({ start: { x: currentX, y: tableY }, end: { x: currentX, y: tableY - 2 * rowHeight }, thickness: 1, color: rgb(0, 0, 0) });
      if (i < 4) currentX += colWidths[i];
    }

    const textOpts = { size: 8, font: timesBoldFont, color: rgb(0, 0, 0) };
    const valOpts = { size: 8, font: timesRomanFont, color: rgb(0, 0, 0) };
    
    const drawCheckbox = (x, y, text) => {
      page.drawRectangle({ x: x, y: y - 4, width: 6, height: 6, borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText(text, { x: x + 10, y: y - 4, ...valOpts });
    };
    
    page.drawText("Catégorie retenue", { x: tableX + 5, y: tableY - 15, ...textOpts });
    drawCheckbox(tableX + colWidths[0] + 5, tableY - 12, "FC TORO");
    drawCheckbox(tableX + colWidths[0] + 65, tableY - 12, "TI TORO");
    
    page.drawText("Plan retenu", { x: tableX + colWidths[0] + colWidths[1] + 5, y: tableY - 15, ...textOpts });
    drawCheckbox(tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, tableY - 12, "Annuel");
    drawCheckbox(tableX + colWidths[0] + colWidths[1] + colWidths[2] + 45, tableY - 12, "Semestriel");
    drawCheckbox(tableX + colWidths[0] + colWidths[1] + colWidths[2] + 95, tableY - 12, "Mensuel");
    
    page.drawText("Montant total dû", { x: tableX + 5, y: tableY - rowHeight - 15, ...textOpts });
    page.drawText("$", { x: tableX + colWidths[0] + 5, y: tableY - rowHeight - 15, ...valOpts });
    page.drawText("Montant versé à l'inscription", { x: tableX + colWidths[0] + colWidths[1] + 5, y: tableY - rowHeight - 15, ...textOpts });
    page.drawText("$", { x: tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, y: tableY - rowHeight - 15, ...valOpts });

    currentY -= (2 * rowHeight + 40);

    page.drawLine({ start: { x: 345, y: currentY }, end: { x: 545, y: currentY }, thickness: 1, color: rgb(0, 0, 0) });
    page.drawText("Signature du Responsable", { x: 380, y: currentY - 15, size: 10, font: timesBoldFont, color: rgb(0, 0, 0) });

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
        "Content-Disposition": `attachment; filename=Dossier_FC_TORO_${reg.child_last_name || "Inscription"}.pdf`,
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
