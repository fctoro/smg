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
  parentEmail?: string
): Promise<string> {
  const doc = new jsPDF();
  
  const parentFullName = parentNom && parentPrenom 
    ? `${parentNom} ${parentPrenom}` 
    : "Parent / Tuteur";
    
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
  doc.text("PARENT / TUTEUR", 14, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(parentFullName, 14, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text(`Tél : ${parentTelephone || "-"}`, 14, 72);
  doc.text(`Email : ${parentEmail || "-"}`, 14, 78);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
  doc.text("JOUEUR (ENFANT)", 120, 60);
  
  let currentY = 66;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(getPlayerFullName(player), 120, currentY);
  currentY += 6;
  
  if (player.categorie) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text(`Catégorie : ${player.categorie}`, 120, currentY);
    currentY += 8;
  } else {
    currentY += 4;
  }

  const tableStartY = Math.max(90, currentY + 5);

  const tableColumn = ["Date", "Joueur (Enfant)", "Remarque", "Mode", "Montant"];
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
      p.remarque || "Paiement de cotisation",
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
      0: { cellWidth: 30, halign: 'left' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 30, halign: 'left' },
      4: { cellWidth: 35, fontStyle: 'bold', halign: 'right' }
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Sous-total", 140, finalY + 10);
  doc.text(totalPayeLabel, 196, finalY + 10, { align: 'right' });

  doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setLineWidth(0.5);
  doc.line(135, finalY + 15, 196, finalY + 15);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("TOTAL PAYÉ", 140, finalY + 22);
  doc.text(totalPayeLabel, 196, finalY + 22, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text("Merci de votre confiance.", 14, finalY + 15);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Ce reçu confirme les paiements pour l'inscription de votre/vos", 14, finalY + 20);
  doc.text("enfant(s) au sein du FC TORO. Document officiel valide", 14, finalY + 24);
  doc.text("sans signature physique.", 14, finalY + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Signature autorisée", 14, finalY + 45);
  doc.line(14, finalY + 55, 60, finalY + 55);

  // Use datauristring and we will process it in the server
  return doc.output('datauristring');
}
