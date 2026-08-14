import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const runtime = "nodejs";

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function resolvePhotoBytes(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) {
    try {
      const response = await fetch(photoUrl, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    } catch (e) {
      console.warn(`[resolvePhotoBytes] Could not fetch URL ${photoUrl}:`, e.message);
    }
  }
  return null;
}

async function embedImage(pdfDoc, bytes) {
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
  
  return pdfDoc.embedPng(bytes); // default fallback
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
      .select("payload, created_at")
      .eq("id", id);

    if (msgErr || !msgRows || msgRows.length === 0) {
      return NextResponse.json({ error: "Message non trouve." }, { status: 404 });
    }

    const msg = msgRows[0];
    const metadata = msg.payload || {};

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Draw Logo
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

    page.drawText("FC TORO - DÉTECTION", {
      x: 105,
      y: height - 55,
      size: 20,
      font: timesBoldFont,
      color: rgb(0.1, 0.1, 0.3),
    });

    page.drawText("FICHE DE CANDIDATURE", {
      x: 105,
      y: height - 75,
      size: 12,
      font: timesBoldFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText("7, Rue Rigaud Pétion-Ville, Haïti | footballclubtoro@gmail.com", {
      x: 105,
      y: height - 90,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw Photo if exists
    if (metadata.photo_recente_url) {
      try {
        const photoBytes = await resolvePhotoBytes(metadata.photo_recente_url);
        if (photoBytes) {
          const photoOffsetY = 40;
          const photoImage = await embedImage(pdfDoc, photoBytes);

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
        `Document généré le ${new Date().toLocaleDateString("fr-FR")} - Page ${pageNumber}`,
        {
          x: 40,
          y: 30,
          size: 8,
          font: timesRomanFont,
          color: rgb(0.6, 0.6, 0.6),
        },
      );
    };
    drawFooter(page, 1);

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
        
        let textVal = String(value || "").trim();
        if (!textVal || textVal === "undefined" || textVal === "null") textVal = "(Champ laissé vide)";

        // Handle multiline text for experience
        if (textVal.length > 70) {
          const words = textVal.split(" ");
          let currentLine = "";
          const lines = [];
          
          words.forEach((word) => {
            if ((currentLine + word).length > 70) {
              lines.push(currentLine);
              currentLine = word + " ";
            } else {
              currentLine += word + " ";
            }
          });
          if (currentLine) lines.push(currentLine);

          lines.forEach(line => {
            page.drawText(line.trim(), {
              x: 180,
              y: currentY,
              size: 10,
              font: timesRomanFont,
              color: textVal === "(Champ laissé vide)" ? rgb(0.8, 0.1, 0.1) : rgb(0, 0, 0),
            });
            currentY -= 14;
          });
        } else {
          page.drawText(textVal, {
            x: 180,
      const colWidth = (width - 100) / 2;
      for (let i = 0; i < fields.length; i += 2) {
        const field1 = fields[i];
        const field2 = fields[i + 1];

        if (field1) {
          page.drawText(field1[0], {
            x: 50,
            y: currentY,
            size: 9,
            font: timesBoldFont,
            color: rgb(0.3, 0.3, 0.3),
          });
          page.drawText(String(field1[1] || "N/A"), {
            x: 150,
            y: currentY,
            size: 9,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
        }

        if (field2) {
          page.drawText(field2[0], {
            x: 50 + colWidth,
            y: currentY,
            size: 9,
            font: timesBoldFont,
            color: rgb(0.3, 0.3, 0.3),
          });
          page.drawText(String(field2[1] || "N/A"), {
            x: 150 + colWidth,
            y: currentY,
            size: 9,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
        }

        currentY -= 18;
      }
    };

    const drawFooter = (targetPage, pageNum) => {
      targetPage.drawLine({
        start: { x: 40, y: 40 },
        end: { x: width - 40, y: 40 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      targetPage.drawText("FC TORO - Fiche de candidature Détection officielle", {
        x: 40,
        y: 25,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      targetPage.drawText(`Page ${pageNum}`, {
        x: width - 80,
        y: 25,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    drawSectionHeader("1. INFORMATIONS DU JOUEUR");
    drawFields([
      ["Nom:", metadata.nom],
      ["Prénom:", metadata.prenom],
      ["Sexe:", metadata.sexe],
      ["Date de naissance:", metadata.date_naissance],
      ["Lieu de naissance:", metadata.lieu_naissance],
      ["Zone de résidence:", metadata.zone_residence],
    ]);

    currentY -= 15;
    drawSectionHeader("2. PROFIL SPORTIF");
    drawFields([
      ["Pied dominant:", metadata.pied_dominant],
      ["Club actuel:", metadata.club_actuel],
      ["Niveau actuel:", metadata.niveau_actuel],
      ["Expérience compétitive:", metadata.experience_competitive],
    ]);

    currentY -= 15;
    drawSectionHeader("3. INFORMATIONS COMPLÉMENTAIRES");
    drawFields([
      ["Comment identifié:", metadata.comment_identifie],
      ["Téléphone candidat:", metadata.telephone],
      ["Email candidat:", metadata.email],
    ]);

    currentY -= 15;
    drawSectionHeader("4. PARENT / TUTEUR LÉGAL");
    drawFields([
      ["Nom du parent:", metadata.parent_nom],
      ["Lien de parenté:", metadata.parent_lien],
      ["Téléphone parent:", metadata.parent_telephone],
    ]);

    currentY -= 15;
    drawSectionHeader("5. CONTACT D'URGENCE");
    drawFields([
      ["Nom urgence:", metadata.urgence_nom],
      ["Téléphone urgence:", metadata.urgence_telephone],
    ]);

    drawFooter(page, 1);

    const attachmentsToEmbed = [
      { key: "photo_recente", label: "PHOTO RÉCENTE DU JOUEUR", url: metadata.photo_recente_url },
      { key: "fiche_9e", label: "FICHE 9ÈME", url: metadata.fiche_9e_url },
      { key: "carnet_vaccination", label: "CARNET DE VACCINATION", url: metadata.carnet_vaccination_url },
      { key: "acte_naissance", label: "ACTE DE NAISSANCE", url: metadata.acte_naissance_url },
      { key: "piece_identite_parent", label: "PIÈCE D'IDENTITÉ PARENT", url: metadata.piece_identite_parent_url },
    ];

    const seenUrls = new Set();

    for (const att of attachmentsToEmbed) {
      if (!att.url || seenUrls.has(att.url)) continue;
      seenUrls.add(att.url);

      try {
        const fileBytes = await resolvePhotoBytes(att.url);
        if (fileBytes && fileBytes.length > 0) {
          const isPdf = fileBytes.length >= 4 && fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46; // %PDF

          if (isPdf) {
            try {
              const srcDoc = await PDFDocument.load(fileBytes);
              const copiedPages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
              for (let i = 0; i < copiedPages.length; i++) {
                const pdfPage = pdfDoc.addPage(copiedPages[i]);
                drawFooter(pdfPage, pdfDoc.getPageCount());
              }
            } catch (pdfErr) {
              console.warn(`Could not copy PDF pages for ${att.label}:`, pdfErr.message);
            }
          } else {
            const annexPage = pdfDoc.addPage([595.28, 841.89]);
            const pageNumber = pdfDoc.getPageCount();

            annexPage.drawText(`ANNEXE : ${att.label}`, {
              x: 50,
              y: 800,
              size: 14,
              font: timesBoldFont,
              color: rgb(0.1, 0.1, 0.3),
            });

            annexPage.drawLine({
              start: { x: 40, y: 785 },
              end: { x: width - 40, y: 785 },
              thickness: 1,
              color: rgb(0.8, 0.1, 0.1),
            });

            const photoImage = await embedImage(pdfDoc, fileBytes);
            const maxWidth = 500;
            const maxHeight = 650;
            let drawWidth = photoImage.width;
            let drawHeight = photoImage.height;
            const ratio = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
            drawWidth *= ratio;
            drawHeight *= ratio;

            annexPage.drawImage(photoImage, {
              x: (595.28 - drawWidth) / 2,
              y: 841.89 - drawHeight - 120,
              width: drawWidth,
              height: drawHeight,
            });

            drawFooter(annexPage, pageNumber);
          }
        }
      } catch (error) {
        console.warn(`Could not embed annex ${att.label}:`, error.message);
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Detection_FC_TORO_${metadata.nom || "Joueur"}.pdf`,
      },
    });
  } catch (error) {
    console.error("[GET /api/detections/pdf]", error.stack);
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du PDF.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
