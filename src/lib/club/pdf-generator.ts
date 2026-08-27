import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { FC_TORO_LOGO, OCTACORE_LOGO } from "@/lib/club/pdfAssets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Player } from "@/types/club";
import { PDFDocument } from "pdf-lib";

export async function generateReceiptPDFBase64(
  player: Player,
  payments: any[],
  parentNom?: string,
  parentPrenom?: string,
  parentTelephone?: string,
  parentEmail?: string,
  parentAddress?: string,
  proofImageBase64?: string | string[] | null,
  autoPrint: boolean = false,
  totalRubriques?: number
): Promise<string> {
  const doc = new jsPDF();
  
  const computedName = [parentNom, parentPrenom].filter(Boolean).join(" ");
  const parentFullName = computedName.length > 0 ? computedName : "Parent / Tuteur";
    
  const initials = parentFullName !== "Parent / Tuteur" 
    ? (parentNom?.charAt(0) || "") + (parentPrenom?.charAt(0) || "")
    : "PT";
    
  const randomDigits = Math.floor(Math.random() * 90000) + 10000;
  const receiptNo = `RP-FCTORO-${initials.toUpperCase()}-${randomDigits}`;

  const grayDark: [number, number, number] = [31, 41, 55];    
  const grayMedium: [number, number, number] = [107, 114, 128]; 
  const grayLight: [number, number, number] = [229, 231, 235];  
  const black: [number, number, number] = [0, 0, 0];

  try {
    doc.addImage(FC_TORO_LOGO, 'PNG', 14, 15, 25, 25);
  } catch (e) {
    console.warn("Erreur chargement logo PDF", e);
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text("FC TORO", 43, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Football Club", 43, 29);
  doc.text("7 Rue Rigaud, Pétion-Ville, Haïti", 43, 34);
  doc.text("+509 2817-8676 | footballclubtoro@gmail.com", 43, 39);
  
  doc.setTextColor(82, 107, 132); 
  doc.textWithLink("www.fctoro.com", 43, 44, { url: "https://www.fctoro.com" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text("REÇU", 196, 26, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("N° de reçu :", 155, 34, { align: 'right' });
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(receiptNo, 196, 34, { align: 'right' });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Date :", 155, 39, { align: 'right' });
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 196, 39, { align: 'right' });

  doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  const headerTextColor: [number, number, number] = [82, 107, 132]; 
  const headerLineColor: [number, number, number] = [226, 232, 240];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.text("JOUEUR (ENFANT)", 14, 60);

  let currentY = 66;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(getPlayerFullName(player), 14, currentY);
  currentY += 6;

  if (player.categorie) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text(`Catégorie : ${player.categorie}`, 14, currentY);
    currentY += 8;
  } else {
    currentY += 4;
  }

  let enfantY = currentY;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.text("PARENT / TUTEUR", 120, 60);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  
  // Si le parent n'est pas renseigné, on affiche juste "Parent / Tuteur" (on évite de mettre le nom de l'enfant)
  const displayParentName = parentFullName === getPlayerFullName(player) ? "Parent / Tuteur" : parentFullName;
  doc.text(displayParentName, 120, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text(`Tél : ${parentTelephone || "-"}`, 120, 72);
  doc.text(`Email : ${parentEmail || "-"}`, 120, 78);
  
  let parentY = 84;
  if (parentAddress) {
    const shortAddress = parentAddress.length > 40 ? parentAddress.substring(0, 37) + "..." : parentAddress;
    doc.text(`Adresse : ${shortAddress}`, 120, parentY);
    parentY += 6;
  }



  const tableStartY = Math.max(90, Math.max(enfantY, parentY) + 5);

  const tableColumn = ["Date", "Joueur (Enfant)", "Description", "Mode", "Montant"];
  const tableRows: any[] = [];

  const mapMode = (mode: any) => {
    const modeStr = String(mode || "").toLowerCase().trim();
    if (modeStr === "1") return "Espèces";
    if (modeStr === "2") return "Virement";
    if (modeStr === "3") return "Chèque";
    if (modeStr === "4") return "Carte";
    if (modeStr === "5" || modeStr === "mobile" || modeStr === "depot" || modeStr === "dépôt" || modeStr.includes("depot") || modeStr.includes("dépôt")) return "Dépôt bancaire";
    if (modeStr === "virement") return "Virement";
    if (modeStr === "especes" || modeStr === "espèces" || modeStr === "espece" || modeStr === "espèce") return "Espèces";
    if (modeStr === "cheque" || modeStr === "chèque") return "Chèque";
    if (modeStr === "carte") return "Carte";
    return String(mode || "-");
  };

  const cleanRemarkForPDF = (remark: string) => {
    if (!remark) return "Paiement de cotisation";
    // Supprime tous les tags système du type [CLE:VALEUR] ou [CLE]
    let cleaned = remark.replace(/\[.*?\]\s*/g, '').trim();
    
    // Remplacer les séparateurs par des sauts de ligne
    cleaned = cleaned.replace(/\s*\|\s*/g, '\n');
    
    // Si c'est un paiement sans adhésion, on supprime la mention "Plan: XXX" ajoutée par erreur
    const isKitOnly = !remark.toLowerCase().includes("adhésion") && !remark.toLowerCase().includes("adhesion");
    if (isKitOnly) {
      cleaned = cleaned.replace(/\n?Plan\s*:\s*[^\n]+/gi, '');
      cleaned = cleaned.replace(/^Plan\s*:\s*[^\n]+\n?/gi, '');
    } else {
      cleaned = cleaned.replace(/\s*Plan:\s*/g, '\nPlan : ');
    }
    
    // Retirer complètement le mot "Rubriques:" pour ne garder que les noms des articles
    cleaned = cleaned.replace(/Rubriques\s*:\s*/gi, '');
    cleaned = cleaned.replace(/Rubriques:\s*/gi, '');
    
    if (cleaned.includes('•')) {
      cleaned = cleaned.replace(/,\s*/g, '\n• ');
    }

    return cleaned.trim() || "Paiement de cotisation";
  };

  const mainPayment = payments[0] || {};
  const isHTG = mainPayment.devise === "HTG";
  // Lire taux depuis la colonne DB, sinon depuis le marqueur [TAUX:XXX] dans la remarque
  let taux = mainPayment.taux || 0;
  if (isHTG && taux <= 1) {
    const tauxMatch = (mainPayment.remarque || "").match(/\[TAUX:\s*([\d.]+)\s*\]/i);
    if (tauxMatch && tauxMatch[1]) {
      taux = parseFloat(tauxMatch[1]);
    } else {
      taux = 130; // Fallback pour les anciens paiements corrompus
    }
  }

  let totalUSD = 0;
  let totalHTG = 0;

  payments.forEach((p: any) => {
    const pTaux = Number(p.taux) || 0;
    let valUS = 0;
    let valHTG = 0;

    if (p.devise === "US" || p.montantUS || p.MntPayeUS) {
      valUS = Number(p.montantUS || p.MntPayeUS || p.montant || 0);
      valHTG = pTaux > 0 ? valUS * pTaux : (taux > 0 ? valUS * taux : 0);
    } else if (p.devise === "HTG" || p.montantHTG || p.MntPayeGd) {
      valHTG = Number(p.montantHTG || p.MntPayeGd || p.montant || 0);
      valUS = pTaux > 0 ? valHTG / pTaux : (taux > 0 ? valHTG / taux : 0);
    } else {
      valUS = Number(p.montant || 0);
      valHTG = valUS * (taux > 0 ? taux : 130);
    }

    totalUSD += valUS;
    totalHTG += valHTG;

    const mntStr = p.devise === "HTG" || p.MntPayeGd 
      ? formatClubCurrency(p.montant || p.MntPayeGd, "HTG") 
      : formatClubCurrency(p.montant || p.MntPayeUS, "US");

    const pData = [
      String(formatClubDate(p.datePaiement ?? new Date())),
      getPlayerFullName(player),
      cleanRemarkForPDF(p.remarque),
      String(mapMode(p.methode || p.ModePaiement)),
      mntStr,
    ];
    tableRows.push(pData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: 'plain',
    styles: { 
      fontSize: 9, 
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
    },
    headStyles: { 
      fillColor: false,
      textColor: headerTextColor,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { textColor: grayDark },
    columnStyles: {
      0: { cellWidth: 24, halign: 'left' },
      1: { cellWidth: 38, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 26, halign: 'left' },
      4: { cellWidth: 32, fontStyle: 'bold', halign: 'right' }
    },
    didParseCell: function (data: any) {
      if (data.section === 'head' && data.column.index === 4) {
        data.cell.styles.halign = 'right';
      }
    },
    didDrawCell: function (data: any) {
      if (data.section === 'head') {
        doc.setDrawColor(headerLineColor[0], headerLineColor[1], headerLineColor[2]);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || tableStartY;

  const playerStatus = (player.statutJoueur || "").toLowerCase().trim();
  const isBoursierReceipt = playerStatus === "bourse" || playerStatus === "boursier" ||
    payments.some((p: any) => (p.remarque || "").toLowerCase().includes("[plan:boursier]"));

  let totalDueValue = 0; // toujours en USD

  if (isBoursierReceipt) {
    // Boursiers : total dû = montant versé → solde = 0
    payments.forEach((p: any) => {
      const pTaux = p.taux || 0;
      totalDueValue += (p.devise === "HTG" && pTaux > 0) ? p.montant / pTaux : p.montant;
    });
  } else {
    payments.forEach((p: any) => {
      const dueMatch = p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      let isValidDue = false;
      let parsedDue = 0;
      if (dueMatch && dueMatch[1]) {
        parsedDue = parseFloat(dueMatch[1]);
        const remarkLower = (p.remarque || "").toLowerCase();
        const isKitOnly = !remarkLower.includes("adhésion") && !remarkLower.includes("adhesion");
        // Ignore phantom adhesion debt on kit-only payments
        if (!(isKitOnly && parsedDue >= 900)) {
          isValidDue = true;
        }
      }

      if (isValidDue) {
        totalDueValue += parsedDue;
      } else {
        // Fallback : utiliser le montant payé (pas de solde possible)
        const pTaux = p.taux || 0;
        totalDueValue += (p.devise === "HTG" && pTaux > 0) ? p.montant / pTaux : p.montant;
      }
    });
  }

  // Calcul des totaux et soldes selon la devise
  const totalDueHTG = (isHTG && taux > 0) ? Math.round(totalDueValue * taux) : 0;
  const balanceHTG = Math.max(0, totalDueHTG - totalHTG);
  const balanceUSD = Math.max(0, totalDueValue - totalUSD);

  const balanceNumeric = isHTG ? balanceHTG : Number(balanceUSD.toFixed(2));

  // Libellé du montant versé — strictement dans la devise du reçu
  const totalPayeLabel = isHTG
    ? formatClubCurrency(totalHTG, "HTG")
    : formatClubCurrency(totalUSD, "US");

  // Libellé du montant total dû — strictly dans la devise du reçu
  const totalDueLabel = (() => {
    if (totalDueValue <= 0) return totalPayeLabel;
    if (isHTG && taux > 0) {
      return formatClubCurrency(totalDueHTG, "HTG");
    }
    return formatClubCurrency(totalDueValue, "US");
  })();

  // Libellé du solde restant — strictement dans la devise du reçu
  const balanceLabel = isHTG
    ? formatClubCurrency(balanceHTG, "HTG")
    : formatClubCurrency(balanceUSD, "US");

  let yPos = finalY + 10;

  // 1. MONTANT TOTAL DÛ
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Montant total dû :", 110, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(totalDueLabel, 196, yPos, { align: 'right' });

  // 2. MONTANT DONNÉ (PAYÉ)
  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Montant versé :", 110, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(totalPayeLabel, 196, yPos, { align: 'right' });

  // Séparateur
  yPos += 4;
  doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setLineWidth(0.5);
  doc.line(100, yPos, 196, yPos);

  // 3. SOLDE RESTANT
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  if (balanceNumeric > 0) {
    doc.text("SOLDE RESTANT :", 110, yPos);
    doc.text(balanceLabel, 196, yPos, { align: 'right' });
  } else {
    doc.text("SOLDE RESTANT :", 110, yPos);
    doc.text(isHTG ? "0.00 HTG" : "US$0.00", 196, yPos, { align: 'right' });
  }

  const footerY = Math.max(finalY + 15, yPos + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text("Merci de votre confiance.", 14, footerY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Ce reçu confirme les paiements pour l'inscription de votre/vos", 14, footerY + 5);
  doc.text("enfant(s) au sein du FC TORO. Document officiel valide", 14, footerY + 9);
  doc.text("sans signature physique.", 14, footerY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Signature autorisée", 14, footerY + 30);
  doc.line(14, footerY + 40, 60, footerY + 40);

  const proofList: string[] = Array.isArray(proofImageBase64)
    ? proofImageBase64.filter(Boolean) as string[]
    : proofImageBase64
    ? [proofImageBase64]
    : [];

  const imageProofs: string[] = [];
  const pdfProofs: string[] = [];

  for (const rawItem of proofList) {
    if (!rawItem) continue;
    let item = rawItem;

    // Si c'est une URL blob: ou http:, la convertir en base64 pour jsPDF / pdf-lib
    if (item.startsWith("blob:") || item.startsWith("http://") || item.startsWith("https://")) {
      try {
        const res = await fetch(item);
        const blob = await res.blob();
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (b64) item = b64;
      } catch (fetchErr) {
        console.warn("Erreur chargement preuve dans pdf-generator:", item, fetchErr);
      }
    }

    if (item.startsWith("data:application/pdf") || item.includes("application/pdf")) {
      pdfProofs.push(item);
    } else if (item.startsWith("data:image/") || item.includes("image/") || item.startsWith("data:")) {
      imageProofs.push(item);
    }
  }

  // 1. Ajouter chaque image sur sa propre page dédiée
  for (let idx = 0; idx < imageProofs.length; idx++) {
    const imgData = imageProofs[idx];
    try {
      let imgFormat = 'JPEG';
      if (imgData.includes('image/png')) imgFormat = 'PNG';
      if (imgData.includes('image/webp')) imgFormat = 'WEBP';
      
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imgData;
        if (img.complete) resolve(true);
      });

      const imgWidth = img.width || 180;
      const imgHeight = img.height || 250;
      const ratio = imgWidth / imgHeight;

      // Ajouter une nouvelle page dédiée pour cette pièce justificative
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(black[0], black[1], black[2]);
      const proofHeader = imageProofs.length > 1
        ? `DOCUMENT JUSTIFICATIF (${idx + 1}/${imageProofs.length})`
        : "DOCUMENT JUSTIFICATIF";
      doc.text(proofHeader, 14, 20);

      let printWidth = 180;
      let printHeight = printWidth / ratio;
      
      // Si l'image est trop haute pour la page, on réduit en fonction de la hauteur max
      if (printHeight > 250) {
          printHeight = 250;
          printWidth = printHeight * ratio;
      }
      
      // Centrer l'image horizontalement (la largeur dispo est 180, marge gauche 14)
      const xOffset = 14 + (180 - printWidth) / 2;
      
      doc.addImage(imgData, imgFormat, xOffset, 25, printWidth, printHeight, undefined, 'FAST');
    } catch (err) {
      console.warn("Could not add proof image to PDF", err);
    }
  }

  // --- Appliquer le footer Octacore sur TOUTES les pages du document ---
  try {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const bottomLineY = 282;
      doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
      doc.setLineWidth(0.3);
      doc.line(14, bottomLineY, 196, bottomLineY);

      const logoH = 3.5;
      const logoW = logoH * 5.638; // ~19.73 mm
      const gap = 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      const textPrefix = "Powered by";
      const textSeparator = "•";
      const textUrl = "www.octacore.io";

      const wPrefix = doc.getTextWidth(textPrefix);
      const wSep = doc.getTextWidth(textSeparator);
      const wUrl = doc.getTextWidth(textUrl);

      const totalBlockW = wPrefix + gap + logoW + gap + wSep + gap + wUrl;
      const startX = (210 - totalBlockW) / 2;
      const textY = 287.3;

      let curX = startX;

      // 1. "Powered by"
      doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
      doc.text(textPrefix, curX, textY);
      curX += wPrefix + gap;

      // 2. Logo OCTACORE
      if (OCTACORE_LOGO) {
        doc.addImage(OCTACORE_LOGO, "PNG", curX, 284.4, logoW, logoH, undefined, "FAST");
      }
      curX += logoW + gap;

      // 3. "•"
      doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
      doc.text(textSeparator, curX, textY);
      curX += wSep + gap;

      // 4. "www.octacore.io"
      doc.setTextColor(59, 130, 246);
      doc.text(textUrl, curX, textY);

      // Lien cliquable interactif dans le PDF vers https://octacore.io
      doc.link(startX, 283.5, totalBlockW, 6, { url: "https://octacore.io" });
    }
  } catch (err) {
    console.warn("Could not render Octacore footer on all pages", err);
  }

  // Si le justificatif comporte des documents PDF scannés, on fusionne leurs pages
  if (pdfProofs.length > 0) {
    try {
      const receiptPdfData = doc.output("arraybuffer");
      const mergedPdf = await PDFDocument.load(receiptPdfData);

      for (const pdfItem of pdfProofs) {
        try {
          const proofBase64Clean = pdfItem.includes("base64,")
            ? pdfItem.split("base64,")[1]
            : pdfItem;
          const proofBytes = Uint8Array.from(atob(proofBase64Clean), (c) => c.charCodeAt(0));
          const proofPdf = await PDFDocument.load(proofBytes);

          const copiedPages = await mergedPdf.copyPages(proofPdf, proofPdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (singleErr) {
          console.warn("Could not merge individual PDF proof", singleErr);
        }
      }

      return await mergedPdf.saveAsBase64({ dataUri: true });
    } catch (err) {
      console.warn("Could not merge PDF proofs into receipt PDF", err);
    }
  }

  // Activer l'impression automatique à l'ouverture du PDF si demandé
  if (autoPrint) {
    doc.autoPrint();
  }

  // Use datauristring and we will process it in the server
  return doc.output('datauristring');
}
