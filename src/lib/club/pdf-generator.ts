import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { FC_TORO_LOGO, OCTACORE_LOGO } from "@/lib/club/pdfAssets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Player } from "@/types/club";
import { PDFDocument } from "pdf-lib";
import { decomposePaymentTransactions } from "@/lib/club/statistics";

export const mapMode = (mode: any) => {
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

export const extractRabaisLabelFromRemark = (remark?: string, isHTG: boolean = false): string | null => {
  if (!remark) return null;

  // 1. Marqueur explicite [RABAIS:X%] ou [RABAIS:$X]
  const rabaisPctMatch = remark.match(/\[RABAIS:\s*([\d.]+)%\s*\]/i);
  const rabaisAmtMatch = remark.match(/\[RABAIS:\s*\$?([\d.]+)\s*\]/i);
  let explicitRabais = "";
  if (rabaisPctMatch && rabaisPctMatch[1]) {
    const val = parseFloat(rabaisPctMatch[1]);
    if (val > 0) explicitRabais = `${val}%`;
  } else if (rabaisAmtMatch && rabaisAmtMatch[1]) {
    const val = parseFloat(rabaisAmtMatch[1]);
    if (val > 0) explicitRabais = `$${val.toFixed(2)}`;
  }

  // 2. Détection du Plan (Annuel = 10%, Semestriel = 5%)
  const isPlanAnnuel = /\[PLAN:\s*ANNUEL\s*\]/i.test(remark) || /Plan\s*:\s*Annuel/i.test(remark);
  const isPlanSemestriel = /\[PLAN:\s*SEMESTRIEL\s*\]/i.test(remark) || /Plan\s*:\s*Semestriel/i.test(remark);

  if (explicitRabais && isPlanAnnuel) {
    return `${explicitRabais} (+ 10% Plan Annuel)`;
  }
  if (explicitRabais && isPlanSemestriel) {
    return `${explicitRabais} (+ 5% Plan Semestriel)`;
  }
  if (explicitRabais) {
    return explicitRabais;
  }
  if (isPlanAnnuel) {
    return "10% (Plan Annuel)";
  }
  if (isPlanSemestriel) {
    return "5% (Plan Semestriel)";
  }

  // 3. Bourses / Demi-bourses
  if (/\[REDUCTION:\s*FULL\s*\]/i.test(remark)) return "100% (Bourse)";
  if (/\[REDUCTION:\s*HALF\s*\]/i.test(remark) || /\[REDUCTION:\s*FIXED_2500_HTG\s*\]/i.test(remark)) {
    const remLower = remark.toLowerCase();
    const isDemi2500 = remLower.includes("2 500") || remLower.includes("2,500") || remLower.includes("2500") || isHTG;
    if (isDemi2500) return null; // La demi-bourse 2 500 HTG est un tarif forfaitaire en Gourdes, pas un rabais de 50%
    return "50% (Demi-bourse)";
  }
  const customRedMatch = remark.match(/\[REDUCTION_PERCENT:\s*([\d.]+)\s*\]/i);
  if (customRedMatch && customRedMatch[1]) {
    const val = parseFloat(customRedMatch[1]);
    if (val > 0) return `${val}%`;
  }

  return null;
};

export const extractProgrammeFromRemark = (remark?: string): string | null => {
  if (!remark) return null;
  const match = remark.match(/\[PROGRAMME:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};

export const cleanRemarkForPDF = (remark: string, isHTG: boolean = false) => {
  if (!remark) return "Paiement de cotisation";
  const progName = extractProgrammeFromRemark(remark);
  const rabaisLabel = extractRabaisLabelFromRemark(remark, isHTG);

  // Supprime tous les tags système du type [CLE:VALEUR] ou [CLE]
  let cleaned = remark.replace(/\[.*?\]\s*/g, '').trim();
  
  // Remplacer les séparateurs par des sauts de ligne
  cleaned = cleaned.replace(/\s*\|\s*/g, '\n');
  
  // Nettoyer d'anciennes mentions textuelles injectées dans la description
  cleaned = cleaned.replace(/Rabais accordé\s*:\s*50%\s*\(Demi-bourse\)/gi, '').trim();
  cleaned = cleaned.replace(/Rabais accordé\s*:\s*50%/gi, '').trim();
  
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

  if (rabaisLabel) {
    cleaned = `${cleaned}\nRabais accordé : ${rabaisLabel}`;
  }

  if (progName) {
    cleaned = `Programme : ${progName}\n${cleaned}`.trim();
  }

  // Supprimer les sauts de lignes consécutifs
  cleaned = cleaned.replace(/\n\s*\n+/g, '\n').trim();

  return cleaned || (progName ? `Programme : ${progName}` : "Paiement de cotisation");
};

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
  totalRubriques?: number,
  allPlayerPayments?: any[]
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

  const mainPayment = payments[0] || {};
  const isHTG = mainPayment.devise === "HTG" || payments.some((p: any) => p.devise === "HTG" || Number(p.montantHTG) > 0 || Number(p.MntPayeGd) > 0);
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

  // 1. Calcul du montant strict de cette transaction (reçu émis)
  let totalUSD = 0;
  let totalHTG = 0;

  payments.forEach((p: any) => {
    const pTaux = Number(p.taux) || 0;
    let valUS = 0;
    let valHTG = 0;

    if (p.devise === "HTG" || (!p.devise && (p.montantHTG || p.MntPayeGd)) || (Number(p.montant) >= 2000 && !p.montantUS)) {
      valHTG = Number(p.montantHTG || p.montant || p.MntPayeGd || 0);
      valUS = pTaux > 0 ? valHTG / pTaux : (taux > 0 ? valHTG / taux : 0);
    } else {
      valUS = Number(p.montantUS || p.montant || p.MntPayeUS || 0);
      valHTG = pTaux > 0 ? valUS * pTaux : (taux > 0 ? valUS * taux : 0);
    }

    totalUSD += valUS;
    totalHTG += valHTG;

    const mntStr = p.devise === "HTG" || p.MntPayeGd 
      ? formatClubCurrency(p.montant || p.MntPayeGd, "HTG") 
      : formatClubCurrency(p.montant || p.MntPayeUS, "US");

    const pData = [
      String(formatClubDate(p.datePaiement ?? new Date())),
      getPlayerFullName(player),
      cleanRemarkForPDF(p.remarque, isHTG),
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

  // 2. Calcul du dossier complet (Total Dû et Solde Restant)
  const rawHistory = (allPlayerPayments && allPlayerPayments.length > 0) ? allPlayerPayments : payments;
  const targetProg = extractProgrammeFromRemark(mainPayment.remarque);
  const paymentHistory = targetProg
    ? rawHistory.filter((p: any) => extractProgrammeFromRemark(p.remarque) === targetProg)
    : rawHistory.filter((p: any) => !extractProgrammeFromRemark(p.remarque));

  const playerStatus = (player.statutJoueur || "").toLowerCase().trim();
  const isBoursierReceipt = !targetProg && (playerStatus === "bourse" || playerStatus === "boursier" ||
    paymentHistory.some((p: any) => (p.remarque || "").toLowerCase().includes("[plan:boursier]")));
  const isDemiBoursierReceipt = !targetProg && (playerStatus.includes("demi") ||
    paymentHistory.some((p: any) => {
      const rem = (p.remarque || "").toLowerCase();
      return rem.includes("demi-bourse") || rem.includes("demi bourse") || rem.includes("[reduction:half]") || rem.includes("[statut:demi-bourse]");
    }));
  const isDemiBoursier2500Receipt = isDemiBoursierReceipt && (
    isHTG || playerStatus.includes("2500") || playerStatus.includes("2 500") ||
    paymentHistory.some((p: any) => {
      const rem = (p.remarque || "").toLowerCase();
      return rem.includes("2500") || rem.includes("2 500") || p.devise === "HTG";
    })
  );

  let totalDueValue = 0; // en USD ou unité standard
  let totalDueHTG = 0;

  if (targetProg) {
    // Cas Programme Spécial : total dû propre au programme
    const explicitDueMarkers = paymentHistory
      .map((p: any) => p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1])
      .filter(Boolean);

    if (explicitDueMarkers.length > 0) {
      totalDueValue = parseFloat(explicitDueMarkers[0]);
    } else {
      paymentHistory.forEach((p: any) => {
        const pTaux = p.taux || 0;
        totalDueValue += (p.devise === "HTG" && pTaux > 0) ? p.montant / pTaux : (p.montant || 0);
      });
    }
    totalDueHTG = (isHTG && taux > 0) ? Math.round(totalDueValue * taux) : 0;
  } else if (isBoursierReceipt) {
    totalDueValue = paymentHistory.reduce((sum, p) => {
      const match = (p.remarque || "").match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
      if (match && match[1]) return sum + parseFloat(match[1]);
      return sum + (p.devise === "HTG" && taux > 0 ? (p.montant || 0) / taux : (p.montant || 0));
    }, 0);
    totalDueHTG = Math.round(totalDueValue * (taux > 0 ? taux : 130));
  } else if (isDemiBoursier2500Receipt) {
    totalDueHTG = paymentHistory.reduce((sum, p) => {
      const payesMatch = (p.remarque || "").match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || (p.remarque || "").match(/(\d+)\s*mois/i);
      const restantsMatch = (p.remarque || "").match(/\[MOIS_RESTANTS:\s*(\d+)\s*\]/i);
      const moisPayes = payesMatch ? parseInt(payesMatch[1], 10) : 1;
      const moisRestants = restantsMatch ? parseInt(restantsMatch[1], 10) : Math.max(0, 12 - moisPayes);
      const totalSeasonMonths = Math.max(12, moisPayes + moisRestants);
      return sum + (totalSeasonMonths * 2500);
    }, 0);
    totalDueValue = (taux > 0) ? totalDueHTG / taux : totalDueHTG / 130;
  } else if (isDemiBoursierReceipt) {
    const cat = (player.categorie || "").toLowerCase().replace(/[\s-_]/g, "");
    const isTi = cat.includes("titoro") || cat.includes("ti-toro") || cat.includes("ti_toro");
    const demiMonthlyUSD = isTi ? 57.5 : 77.5;

    totalDueValue = paymentHistory.reduce((sum, p) => {
      const payesMatch = (p.remarque || "").match(/\[MOIS_PAYES:\s*(\d+)\s*\]/i) || (p.remarque || "").match(/(\d+)\s*mois/i);
      const restantsMatch = (p.remarque || "").match(/\[MOIS_RESTANTS:\s*(\d+)\s*\]/i);
      const moisPayes = payesMatch ? parseInt(payesMatch[1], 10) : 1;
      const moisRestants = restantsMatch ? parseInt(restantsMatch[1], 10) : Math.max(0, 12 - moisPayes);
      const totalSeasonMonths = Math.max(12, moisPayes + moisRestants);
      return sum + (totalSeasonMonths * demiMonthlyUSD);
    }, 0);
    totalDueHTG = (isHTG && taux > 0) ? Math.round(totalDueValue * taux) : 0;
  } else {
    // Chercher le TOTAL_DUE le plus précis dans l'historique
    const explicitDueMarkers = paymentHistory
      .map((p: any) => p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1])
      .filter(Boolean);

    if (explicitDueMarkers.length > 0) {
      totalDueValue = parseFloat(explicitDueMarkers[0]);
    } else {
      paymentHistory.forEach((p: any) => {
        const pTaux = p.taux || 0;
        totalDueValue += (p.devise === "HTG" && pTaux > 0) ? p.montant / pTaux : (p.montant || 0);
      });
    }
    totalDueHTG = (isHTG && taux > 0) ? Math.round(totalDueValue * taux) : 0;
  }

  // Utiliser totalRubriques si totalDueValue n'a pas été déterminé
  if ((totalDueValue <= 0 || isNaN(totalDueValue)) && totalRubriques && totalRubriques > 0) {
    totalDueValue = totalRubriques;
    totalDueHTG = (isHTG && taux > 0) ? Math.round(totalDueValue * taux) : 0;
  }

  // 3. Décomposition chronologique pour trouver les règlements antérieurs à cette transaction
  const decomposedHistory = decomposePaymentTransactions(paymentHistory, [player]).sort((a, b) => {
    const timeA = new Date(a.datePaiement || 0).getTime();
    const timeB = new Date(b.datePaiement || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const idA = String(a.id || "");
    const idB = String(b.id || "");
    if (idA.endsWith("-init") && !idB.endsWith("-init")) return -1;
    if (!idA.endsWith("-init") && idB.endsWith("-init")) return 1;

    const vA = parseInt(idA.match(/-v(\d+)/i)?.[1] || "0", 10);
    const vB = parseInt(idB.match(/-v(\d+)/i)?.[1] || "0", 10);
    return vA - vB;
  });

  const mainId = String(mainPayment.id || mainPayment.Id || "");
  const mainDate = String(mainPayment.datePaiement || mainPayment.DateTransact || "").split("T")[0];
  const mainMnt = Number(mainPayment.montant || mainPayment.Montant || 0);

  let currentTxIndex = decomposedHistory.findIndex((tx) => String(tx.id) === mainId);

  // Si l'ID ne correspond pas exactement, chercher par type (-init ou -vN)
  if (currentTxIndex === -1 && decomposedHistory.length > 0) {
    if (mainId.endsWith("-init")) {
      currentTxIndex = decomposedHistory.findIndex((tx) => String(tx.id).endsWith("-init"));
    } else {
      const vNumMatch = mainId.match(/-v(\d+)/i);
      if (vNumMatch) {
        currentTxIndex = decomposedHistory.findIndex((tx) => String(tx.id).endsWith(`-v${vNumMatch[1]}`));
      }
    }
  }

  // Matcher par date ET montant
  if (currentTxIndex === -1 && decomposedHistory.length > 0) {
    currentTxIndex = decomposedHistory.findIndex(
      (tx) => tx.datePaiement === mainDate && Math.abs(Number(tx.montant) - mainMnt) < 0.01
    );
  }

  // Si toujours pas trouvé mais que mainPayment a des versements (cas d'un versement nouvellement ajouté dans handleSaveEdit)
  if (currentTxIndex === -1 && decomposedHistory.length > 0) {
    const vMatches = [...String(mainPayment.remarque || mainPayment.Remarque || "").matchAll(/\[VERSEMENT:\s*([\d.]+)_([A-Za-z]+)(?:_TAUX:([\d.]+))?(?:_USD:([\d.]+))?_DATE:(\d{4}-\d{2}-\d{2})\]/gi)];
    if (vMatches.length > 0) {
      currentTxIndex = decomposedHistory.length - 1;
    }
  }

  let priorPaidUSD = 0;
  let priorPaidHTG = 0;

  if (currentTxIndex > 0) {
    for (let i = 0; i < currentTxIndex; i++) {
      const tx = decomposedHistory[i];
      const txTaux = Number(tx.taux) || taux || 135;
      const txUS = Number(tx.montantUS || 0);
      const txHTG = Number(tx.montantHTG || 0);
      if (tx.devise === "HTG" || txHTG > 0) {
        priorPaidHTG += txHTG > 0 ? txHTG : (txUS > 0 && txTaux > 0 ? txUS * txTaux : 0);
        priorPaidUSD += txUS > 0 ? txUS : (txHTG > 0 && txTaux > 0 ? txHTG / txTaux : 0);
      } else {
        priorPaidUSD += txUS > 0 ? txUS : Number(tx.montant || 0);
        priorPaidHTG += txHTG > 0 ? txHTG : (txUS > 0 && txTaux > 0 ? txUS * txTaux : 0);
      }
    }
  } else if (currentTxIndex === -1 && decomposedHistory.length > 0) {
    for (const tx of decomposedHistory) {
      if (mainDate && tx.datePaiement && tx.datePaiement < mainDate) {
        const txTaux = Number(tx.taux) || taux || 135;
        const txUS = Number(tx.montantUS || 0);
        const txHTG = Number(tx.montantHTG || 0);
        if (tx.devise === "HTG" || txHTG > 0) {
          priorPaidHTG += txHTG > 0 ? txHTG : (txUS > 0 && txTaux > 0 ? txUS * txTaux : 0);
          priorPaidUSD += txUS > 0 ? txUS : (txHTG > 0 && txTaux > 0 ? txHTG / txTaux : 0);
        } else {
          priorPaidUSD += txUS > 0 ? txUS : Number(tx.montant || 0);
          priorPaidHTG += txHTG > 0 ? txHTG : (txUS > 0 && txTaux > 0 ? txUS * txTaux : 0);
        }
      }
    }
  }

  const hasPreviousPayments = isHTG ? priorPaidHTG >= 10 : priorPaidUSD >= 0.5;

  const previousBalanceUSD = Math.max(0, totalDueValue - priorPaidUSD);
  const previousBalanceHTG = (isHTG && taux > 0)
    ? Math.round(previousBalanceUSD * taux)
    : Math.max(0, totalDueHTG - priorPaidHTG);

  const balanceUSD = Math.max(0, previousBalanceUSD - totalUSD);
  const balanceHTG = (isHTG && taux > 0)
    ? Math.round(balanceUSD * taux)
    : Math.max(0, previousBalanceHTG - totalHTG);

  const balanceNumeric = isHTG ? balanceHTG : Number(balanceUSD.toFixed(2));

  // Libellés formatés
  const totalPayeLabel = isHTG
    ? formatClubCurrency(totalHTG, "HTG")
    : formatClubCurrency(totalUSD, "US");

  const totalDueLabel = (() => {
    if (isHTG) {
      return formatClubCurrency(totalDueHTG, "HTG");
    }
    if (totalDueValue <= 0) return totalPayeLabel;
    return formatClubCurrency(totalDueValue, "US");
  })();

  const alreadyPaidBeforeLabel = isHTG
    ? formatClubCurrency(priorPaidHTG, "HTG")
    : formatClubCurrency(priorPaidUSD, "US");

  const previousBalanceLabel = isHTG
    ? formatClubCurrency(previousBalanceHTG, "HTG")
    : formatClubCurrency(previousBalanceUSD, "US");

  const balanceLabel = isHTG
    ? formatClubCurrency(balanceHTG, "HTG")
    : formatClubCurrency(balanceUSD, "US");

  let yPos = finalY + 10;

  const appliedRabais = payments
    .map((p: any) => extractRabaisLabelFromRemark(p.remarque, isHTG))
    .find(Boolean);

  // 0. RABAIS ACCORDÉ (si présent)
  if (appliedRabais) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Rabais accordé :", 110, yPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(appliedRabais, 196, yPos, { align: 'right' });
    yPos += 6;
  }

  // 1. MONTANT TOTAL DÛ
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Montant total dû :", 110, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(totalDueLabel, 196, yPos, { align: 'right' });
  yPos += 6;

  // Lignes de décomposition si des versements antérieurs existent
  if (hasPreviousPayments) {
    // 1.b DÉJÀ RÉGLÉ PRÉCÉDEMMENT
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Déjà réglé précédemment :", 110, yPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(alreadyPaidBeforeLabel, 196, yPos, { align: 'right' });
    yPos += 6;

    // 1.c SOLDE PRÉCÉDENT
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Solde précédent :", 110, yPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(previousBalanceLabel, 196, yPos, { align: 'right' });
    yPos += 6;
  }

  // 2. MONTANT VERSÉ (CETTE TRANSACTION)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
  doc.text("Montant versé (cette transaction) :", 110, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(totalPayeLabel, 196, yPos, { align: 'right' });
  yPos += 4;

  // Séparateur
  doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setLineWidth(0.5);
  doc.line(100, yPos, 196, yPos);
  yPos += 6;

  // 3. SOLDE RESTANT
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

export interface PlayerHistoryMetrics {
  totalUSD?: number;
  totalHTG?: number;
  count?: number;
  totalDue?: string;
  balance?: string;
  balanceNum?: number;
}

export async function generatePlayerHistoryPDFBase64(
  player: Player,
  payments: any[],
  parentNom?: string,
  parentPrenom?: string,
  parentTelephone?: string,
  parentEmail?: string,
  parentAddress?: string,
  autoPrint: boolean = false,
  metrics?: PlayerHistoryMetrics,
  contextTitle?: string
): Promise<string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const computedName = [parentNom, parentPrenom].filter(Boolean).join(" ");
  const parentFullName = computedName.length > 0 ? computedName : (player.parentNomPrenom || "Parent / Tuteur");

  // Tri chronologique des versements
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = new Date(a.datePaiement || 0).getTime();
    const dateB = new Date(b.datePaiement || 0).getTime();
    return dateA - dateB;
  });

  // Calculs financiers
  let calcUSD = 0;
  let calcHTG = 0;
  sortedPayments.forEach((p: any) => {
    const amt = Number(p.montant) || 0;
    const pTaux = Number(p.taux) || 0;
    if (p.devise === "HTG") {
      calcHTG += amt;
      calcUSD += pTaux > 0 ? amt / pTaux : 0;
    } else {
      calcUSD += amt;
    }
  });

  const totalUSD = metrics?.totalUSD !== undefined ? metrics.totalUSD : calcUSD;
  const totalHTG = metrics?.totalHTG !== undefined ? metrics.totalHTG : calcHTG;
  const paymentsCount = metrics?.count !== undefined ? metrics.count : sortedPayments.length;

  let totalDueDisplay = metrics?.totalDue || "-";
  if (totalDueDisplay === "-") {
    const explicitDue = sortedPayments
      .map((p: any) => p.remarque?.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i)?.[1])
      .filter(Boolean)[0];
    if (explicitDue) {
      totalDueDisplay = formatClubCurrency(parseFloat(explicitDue), "US");
    } else {
      totalDueDisplay = formatClubCurrency(totalUSD, "US");
    }
  }

  let balanceDisplay = metrics?.balance || "À jour (US$0.00)";
  const balanceNum = metrics?.balanceNum !== undefined ? metrics.balanceNum : 0;
  const isDue = balanceNum > 0.01;

  let paidStr = "";
  if (totalUSD > 0 && totalHTG > 0) {
    paidStr = `${formatClubCurrency(totalUSD, "US")} (${totalHTG.toLocaleString("fr-FR")} HTG)`;
  } else if (totalHTG > 0) {
    paidStr = formatClubCurrency(totalHTG, "HTG");
  } else {
    paidStr = formatClubCurrency(totalUSD, "US");
  }

  const nowFormatted = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1. En-tête Club épuré (Logo + Coordonnées)
  try {
    doc.addImage(FC_TORO_LOGO, "PNG", 15, 12, 18, 18);
  } catch (e) {
    console.warn("Erreur chargement logo PDF", e);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("FC TORO", 37, 17.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Football Club • Direction Administrative", 37, 22.5);
  doc.text("Pétion-Ville, Haïti • +509 2817-8676 • www.fctoro.com", 37, 27);

  // Titre & Date d'édition à droite
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("HISTORIQUE DES TRANSACTIONS", 195, 17.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  if (contextTitle && contextTitle.includes("PROGRAMME")) {
    doc.setTextColor(180, 83, 9); // amber-700
  } else {
    doc.setTextColor(37, 99, 235); // blue-600
  }
  doc.text(contextTitle ? contextTitle.toUpperCase() : "COTISATIONS DE SAISON", 195, 22.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date d'édition : ${nowFormatted}`, 195, 27, { align: "right" });

  // Ligne de séparation sobre
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(15, 31, 195, 31);

  // 2. Encadré Synthétique Sobre : Joueur & Situation du Compte (Simple & Lisible)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, 34.5, 180, 19, 1.2, 1.2, "FD");

  // Ligne 1 : Infos Joueur
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Joueur :", 19, 40);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(getPlayerFullName(player).toUpperCase(), 33, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Matricule :", 110, 40);
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(player.matricule || "N/A", 127, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Catégorie :", 162, 40);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(player.categorie || "N/A", 179, 40);

  // Séparateur fin dans le bandeau
  doc.setDrawColor(226, 232, 240);
  doc.line(19, 43.5, 191, 43.5);

  // Ligne 2 : Montants & Solde
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Total déjà versé :", 19, 49);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text(paidStr, 44, 49);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Total dû (dossier) :", 84, 49);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(totalDueDisplay, 109, 49);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Solde restant :", 143, 49);
  doc.setFont("helvetica", "bold");
  if (isDue) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(5, 150, 105);
  }
  doc.text(balanceDisplay, 163, 49);

  // 3. Grand Tableau des Transactions (Clair, Aéré et Lisible)
  const tableStartY = 58;
  const tableColumn = ["#", "Date", "N° Reçu / Réf.", "Mode", "Rubriques & Détails du Paiement", "Montant"];
  const tableRows: any[] = [];

  sortedPayments.forEach((p: any, idx: number) => {
    const isHTG = p.devise === "HTG";
    const amt = Number(p.montant) || 0;
    const refNo = p.id ? `REC-${String(p.id).slice(0, 8).toUpperCase()}` : `#${idx + 1}`;
    const cleanDesc = cleanRemarkForPDF(p.remarque || "", isHTG);
    const mntStr = formatClubCurrency(amt, isHTG ? "HTG" : "US");

    tableRows.push([
      String(idx + 1),
      p.datePaiement ? formatClubDate(p.datePaiement) : "-",
      refNo,
      mapMode(p.methode || p.ModePaiement),
      cleanDesc,
      mntStr,
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows.length > 0 ? tableRows : [["-", "-", "-", "-", "Aucun versement enregistré", "-"]],
    foot: [
      [
        {
          content: "TOTAL VERSÉ :",
          colSpan: 5,
          styles: { halign: "right", fontStyle: "bold", fontSize: 8.5 },
        },
        {
          content: paidStr,
          styles: { halign: "right", fontStyle: "bold", fontSize: 8.5 },
        },
      ],
    ],
    startY: tableStartY,
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      textColor: [31, 41, 55],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 26, halign: "left" },
      2: { cellWidth: 32, halign: "left", fontStyle: "bold" },
      3: { cellWidth: 24, halign: "left" },
      4: { cellWidth: "auto", halign: "left" },
      5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "right",
    },
    didParseCell: function (data: any) {
      if (data.section === "head" && data.column.index === 5) {
        data.cell.styles.halign = "right";
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || 130;
  if (finalY > 245) {
    doc.addPage();
    finalY = 25;
  }

  // 4. Mention de Preuve & Visa Administration Sobre
  const proofY = finalY + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Document officiel certifiant les versements enregistrés au dossier du joueur.", 15, proofY);
  doc.text("Fait foi de preuve de paiement pour toute vérification administrative interne.", 15, proofY + 4.5);

  // Espace Signature / Visa à droite
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Visa & Signature Administration :", 140, proofY);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(140, proofY + 14, 195, proofY + 14);

  // 5. Pied de Page Sobre
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 284, 195, 284);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("FC TORO — Historique des Transactions • Usage Interne & Administratif", 15, 288);
    doc.text(`Page ${i} sur ${pageCount}`, 195, 288, { align: "right" });
  }

  if (autoPrint) {
    doc.autoPrint();
  }

  return doc.output("datauristring");
}

