import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { FC_TORO_LOGO } from "@/lib/club/pdfAssets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Player } from "@/types/club";

export async function generateReceiptPDFBase64(
  player: Player,
  payments: any[],
  parentNom?: string,
  parentPrenom?: string,
  parentTelephone?: string,
  parentEmail?: string,
  parentAddress?: string,
  proofImageBase64?: string | null,
  autoPrint: boolean = false
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
    const modeStr = String(mode).toLowerCase();
    if (modeStr === "1") return "Espèces";
    if (modeStr === "2") return "Virement";
    if (modeStr === "3") return "Chèque";
    if (modeStr === "4") return "Carte";
    if (modeStr === "5") return "Moncash";
    if (modeStr === "virement") return "Virement";
    if (modeStr === "especes" || modeStr === "espèces") return "Espèces";
    return String(mode || "-");
  };

  const cleanRemarkForPDF = (remark: string) => {
    if (!remark) return "Paiement de cotisation";
    // Supprime tous les tags système du type [CLE:VALEUR] ou [CLE]
    let cleaned = remark.replace(/\[.*?\]\s*/g, '').trim();
    
    // Remplacer les séparateurs par des sauts de ligne
    cleaned = cleaned.replace(/\s*\|\s*/g, '\n\n');
    cleaned = cleaned.replace(/\s*Plan:\s*/g, '\n\nPlan : ');
    
    // Mettre en liste à puces les rubriques si présentes
    if (cleaned.includes('Rubriques:')) {
      cleaned = cleaned.replace(/Rubriques:\s*/, 'Rubriques :\n• ');
      // Astuce simple : remplacer les virgules par des puces, en supposant 
      // que dans cette portion du texte, les virgules séparent les rubriques.
      // Pour éviter de casser d'autres textes, on le fait de manière prudente.
      let parts = cleaned.split('Rubriques :');
      if (parts.length > 1) {
        let rubriquesPart = parts[1];
        rubriquesPart = rubriquesPart.replace(/,\s*/g, '\n• ');
        cleaned = parts[0] + 'Rubriques :' + rubriquesPart;
      }
    }

    return cleaned || "Paiement de cotisation";
  };

  let totalUSD = 0;
  let totalHTG = 0;

  payments.forEach((p: any) => {
    if (p.devise === "US" || p.MntPayeUS) totalUSD += Number(p.montant || p.MntPayeUS || 0);
    if (p.devise === "HTG" || p.MntPayeGd) totalHTG += Number(p.montant || p.MntPayeGd || 0);

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

  const totalPayeLabel = [
    totalUSD > 0 ? formatClubCurrency(totalUSD, "US") : null,
    totalHTG > 0 ? formatClubCurrency(totalHTG, "HTG") : null
  ].filter(Boolean).join(" / ") || formatClubCurrency(0, "US");

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: 'plain',
    styles: { 
      fontSize: 9, 
      cellPadding: 6,
    },
    headStyles: { 
      fillColor: false,
      textColor: headerTextColor,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { textColor: grayDark },
    columnStyles: {
      0: { cellWidth: 25, halign: 'left' },
      1: { cellWidth: 40, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 20, halign: 'left' },
      4: { cellWidth: 25, fontStyle: 'bold', halign: 'right' }
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

  // Extraction / Calcul du total dû pour ce reçu
  const playerStatus = (player.statutJoueur || "").toLowerCase();
  const isBoursierReceipt = playerStatus.includes("bourse") || playerStatus.includes("boursier") || payments.some((p: any) => (p.remarque || "").toLowerCase().includes("[plan:boursier]"));

  let totalDueValue = 0;
  if (isBoursierReceipt) {
    // Pour les boursiers, le montant total dû = montant versé (solde = 0)
    payments.forEach((p: any) => {
      const isHTGPay = p.devise === "HTG";
      const pTaux = p.taux || 1000;
      totalDueValue += isHTGPay ? (p.montant / pTaux) : p.montant;
    });
  } else {
    payments.forEach((p: any) => {
      const dueMatch = p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (dueMatch && dueMatch[1]) {
        totalDueValue += parseFloat(dueMatch[1]);
      } else {
        const isHTGPay = p.devise === "HTG";
        const pTaux = p.taux || 1000;
        totalDueValue += isHTGPay ? (p.montant / pTaux) : p.montant;
      }
    });
  }

  const mainPayment = payments[0] || {};
  const isHTG = mainPayment.devise === "HTG";
  const taux = mainPayment.taux || 1000;

  // Libellé du montant total dû
  const totalDueLabel = totalDueValue > 0 
    ? (isHTG ? formatClubCurrency(Math.round(totalDueValue * taux), "HTG") : formatClubCurrency(totalDueValue, "US"))
    : totalPayeLabel;

  // Calcul du solde
  const paidUSD = isHTG ? totalHTG / taux : totalUSD;
  const balanceUSD = totalDueValue > 0 ? Math.max(0, totalDueValue - paidUSD) : 0;
  const balanceLabel = isHTG 
    ? formatClubCurrency(Math.round(balanceUSD * taux), "HTG")
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
  if (balanceUSD > 0) {
    doc.setTextColor(220, 38, 38); // Rouge si solde restant
    doc.text("SOLDE RESTANT :", 110, yPos);
    doc.text(balanceLabel, 196, yPos, { align: 'right' });
  } else {
    doc.setTextColor(22, 163, 74); // Vert si 0 solde (RÉGLÉ)
    doc.text("SOLDE RESTANT :", 110, yPos);
    doc.text(isHTG ? "0 G" : "US$0", 196, yPos, { align: 'right' });
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

  if (proofImageBase64) {
    try {
      let imgFormat = 'JPEG';
      if (proofImageBase64.includes('image/png')) imgFormat = 'PNG';
      if (proofImageBase64.includes('image/webp')) imgFormat = 'WEBP';
      
      // Obtenir les dimensions réelles de l'image
      const img = new Image();
      img.src = proofImageBase64;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const imgWidth = img.width || 180;
      const imgHeight = img.height || 250;
      const ratio = imgWidth / imgHeight;

      // Ajouter une nouvelle page pour le justificatif
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text("DOCUMENT JUSTIFICATIF", 14, 20);

      let printWidth = 180;
      let printHeight = printWidth / ratio;
      
      // Si l'image est trop haute pour la page, on réduit en fonction de la hauteur max
      if (printHeight > 250) {
          printHeight = 250;
          printWidth = printHeight * ratio;
      }
      
      // Centrer l'image horizontalement (la largeur dispo est 180, marge gauche 14)
      const xOffset = 14 + (180 - printWidth) / 2;
      
      doc.addImage(proofImageBase64, imgFormat, xOffset, 25, printWidth, printHeight, undefined, 'FAST');
    } catch (err) {
      console.warn("Could not add proof image to PDF", err);
    }
  }

  // Activer l'impression automatique à l'ouverture du PDF si demandé
  if (autoPrint) {
    doc.autoPrint();
  }

  // Use datauristring and we will process it in the server
  return doc.output('datauristring');
}
