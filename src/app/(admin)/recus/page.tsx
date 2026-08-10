"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";
import { FC_TORO_LOGO } from "@/lib/club/pdfAssets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RecusPage() {
  const { parents, players, payments } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Regrouper les parents uniques
  const uniqueParents = useMemo(() => {
    const map = new Map<string, { nom: string; prenom: string; email: string; telephone: string; playerIds: Set<string> }>();
    
    parents.forEach(p => {
      const key = p.email ? p.email.toLowerCase().trim() : `${p.nom} ${p.prenom}`.toLowerCase().trim();
      if (!key) return; 
      
      if (!map.has(key)) {
        map.set(key, {
          nom: p.nom,
          prenom: p.prenom,
          email: p.email,
          telephone: p.telephone,
          playerIds: new Set<string>()
        });
      }
      getParentLinkedPlayerIds(p).forEach((playerId) => {
        map.get(key)!.playerIds.add(playerId);
      });
    });

    return Array.from(map.values()).map(p => {
      const pIds = Array.from(p.playerIds);
      const parentPayments = payments.filter((pay) => pIds.includes(pay.playerId));
      const totalPayeUSD = parentPayments.filter(p => p.devise !== "HTG").reduce((sum, pay) => sum + (pay.montant || 0), 0);
      const totalPayeHTG = parentPayments.filter(p => p.devise === "HTG").reduce((sum, pay) => sum + (pay.montant || 0), 0);
      const totalPayeLabel = [
        totalPayeUSD > 0 ? formatClubCurrency(totalPayeUSD, "US") : null,
        totalPayeHTG > 0 ? formatClubCurrency(totalPayeHTG, "HTG") : null
      ].filter(Boolean).join(" / ") || formatClubCurrency(0, "US");
      
      const firstChild = players.find(player => pIds.includes(player.id));
      const adresse = firstChild?.parentAdresse || firstChild?.adresse || "";
      
      return {
        key: p.email ? p.email.toLowerCase().trim() : `${p.nom} ${p.prenom}`.toLowerCase().trim(),
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        telephone: p.telephone,
        adresse,
        playerIds: pIds,
        parentPayments: parentPayments.sort((a, b) => {
          const dateA = a.datePaiement ? new Date(a.datePaiement).getTime() : 0;
          const dateB = b.datePaiement ? new Date(b.datePaiement).getTime() : 0;
          return dateB - dateA;
        }),
        totalPaye: totalPayeLabel,
      };
    });
  }, [parents, payments, players]);

  // 2. Filtrer la liste globale
  const filteredParents = uniqueParents.filter((p) => {
    const fullName = `${p.nom} ${p.prenom}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || p.email.toLowerCase().includes(query) || p.telephone.includes(query);
  });

  const handleGeneratePDF = (parentData: any) => {
    if (!parentData || parentData.parentPayments.length === 0) {
      alert("Ce parent n'a effectué aucun paiement.");
      return;
    }

    const doc = new jsPDF();
    const parentFullName = `${parentData.nom} ${parentData.prenom}`;
    const initials = (parentData.nom.charAt(0) + parentData.prenom.charAt(0)).toUpperCase();
    const randomDigits = Math.floor(Math.random() * 90000) + 10000;
    const receiptNo = `RP-FCTORO-${initials}-${randomDigits}`;
    
    const formatCurrencyPDF = (amountStr: string) => {
      return amountStr;
    };

    // Corporate Monochrome Palette (Minimal color)
    const grayDark: [number, number, number] = [31, 41, 55];    // Charcoal
    const grayMedium: [number, number, number] = [107, 114, 128]; // Mid Gray
    const grayLight: [number, number, number] = [229, 231, 235];  // Light Gray
    const white: [number, number, number] = [255, 255, 255];
    const black: [number, number, number] = [0, 0, 0];

    // ==========================================
    // EN-TÊTE : Logo (gauche) & Infos Document (droite)
    // ==========================================
    try {
      doc.addImage(FC_TORO_LOGO, 'PNG', 14, 15, 25, 25);
    } catch (e) {
      console.warn("Erreur chargement logo PDF", e);
    }
    
    // Company Name next to Logo
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
    
    // Website link (clickable)
    doc.setTextColor(82, 107, 132); // Gris bleu
    doc.textWithLink("www.fctoro.com", 43, 44, { url: "https://www.fctoro.com" });

    // ==========================================
    // REÇU TITLE & META INFOS (Alignés à droite)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("REÇU", 196, 26, { align: 'right' });

    // FIX OVERLAP: Align labels and values cleanly
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

    // Ligne séparatrice fine
    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 196, 48);

    // ==========================================
    // INFO PARENT (Gauche) & JOUEURS (Droite)
    // ==========================================
    const headerTextColor: [number, number, number] = [82, 107, 132]; // Gris bleu du screenshot
    const headerLineColor: [number, number, number] = [226, 232, 240];

    // --- GAUCHE : Parent ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.text("PARENT", 14, 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(parentFullName, 14, 66);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text(`Tél : ${parentData.telephone || "-"}`, 14, 72);
    doc.text(`Email : ${parentData.email || "-"}`, 14, 78);
    
    if (parentData.adresse) {
      const shortAddress = parentData.adresse.length > 45 ? parentData.adresse.substring(0, 42) + "..." : parentData.adresse;
      doc.text(`Adresse : ${shortAddress}`, 14, 84);
    }
    
    // --- DROITE : Joueurs ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.text("JOUEUR (ENFANT)", 120, 60);
    
    let currentY = 66;
    parentData.playerIds.forEach((id: string) => {
      const p = players.find(player => player.id === id);
      if (p) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
        doc.text(`${p.prenom} ${p.nom}`, 120, currentY);
        currentY += 6;
        
        if (p.categorie) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
          doc.text(`Catégorie : ${p.categorie}`, 120, currentY);
          currentY += 8;
        } else {
          currentY += 4;
        }
      }
    });

    const tableStartY = Math.max(90, currentY + 5);

    // ==========================================
    // TABLEAU DES VERSEMENTS (Corporate)
    // ==========================================
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
      let cleaned = remark.replace(/\[.*?\]\s*/g, '').trim();
      
      cleaned = cleaned.replace(/\s*\|\s*/g, '\n\n');
      cleaned = cleaned.replace(/\s*Plan:\s*/g, '\n\nPlan : ');
      
      if (cleaned.includes('Rubriques:')) {
        cleaned = cleaned.replace(/Rubriques:\s*/, 'Rubriques :\n• ');
        let parts = cleaned.split('Rubriques :');
        if (parts.length > 1) {
          let rubriquesPart = parts[1];
          rubriquesPart = rubriquesPart.replace(/,\s*/g, '\n• ');
          cleaned = parts[0] + 'Rubriques :' + rubriquesPart;
        }
      }

      return cleaned || "Paiement de cotisation";
    };

    parentData.parentPayments.forEach((p: any) => {
      const joueurObj = players.find(player => player.id === p.playerId);
      const joueurNom = joueurObj ? getPlayerFullName(joueurObj) : "Inconnu";
      
      const pData = [
        String(formatClubDate(p.datePaiement ?? "")),
        joueurNom,
        cleanRemarkForPDF(p.remarque),
        String(mapMode(p.methode)),
        String(formatCurrencyPDF(p.montant)),
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
        // Dessiner manuellement les lignes horizontales pour l'en-tête (contourne les limites du theme plain)
        if (data.section === 'head') {
          doc.setDrawColor(headerLineColor[0], headerLineColor[1], headerLineColor[2]);
          doc.setLineWidth(0.3);
          // Ligne du haut
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
          // Ligne du bas
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || tableStartY;

    // ==========================================
    // FOOTER SECTION (Totals)
    // ==========================================
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Sous-total", 110, finalY + 10);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 196, finalY + 10, { align: 'right' });

    // Grand Total (Simple ligne, pas de gros bloc de couleur)
    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(100, finalY + 15, 196, finalY + 15);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("TOTAL PAYÉ", 110, finalY + 22);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 196, finalY + 22, { align: 'right' });

    // ==========================================
    // SIGNATURE & TERMES
    // ==========================================
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

    // ==========================================
    // BOTTOM BANNER
    // ==========================================
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);

    doc.save(`Recu_${parentFullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Reçus de Paiement (Comptes Parents)" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Liste des Comptes Parents
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les comptes financiers globaux et téléchargez les reçus consolidés par famille.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (nom, email...)"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 table-auto">
              <thead className="bg-gray-50 text-gray-800 dark:bg-white/[0.02] dark:text-white/90 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Parent</th>
                  <th className="px-5 py-3.5 font-semibold">Contact</th>
                  <th className="px-5 py-3.5 font-semibold text-center whitespace-nowrap">Enfants Inscrits</th>
                  <th className="px-5 py-3.5 font-semibold text-right whitespace-nowrap">Total Payé (USD)</th>
                  <th className="px-5 py-3.5 font-semibold text-center whitespace-nowrap w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredParents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                      Aucun compte parent trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredParents.map((parentData) => (
                    <tr key={parentData.key} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {parentData.nom} {parentData.prenom}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col text-sm">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{parentData.telephone || "Aucun tél"}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[220px]">{parentData.email || "Aucun email"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                          {parentData.playerIds.length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                        {parentData.totalPaye}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleGeneratePDF(parentData)}
                          disabled={parentData.parentPayments.length === 0}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all 
                            ${parentData.parentPayments.length === 0 
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600" 
                              : "bg-brand-500 hover:bg-brand-600 shadow-sm hover:shadow-brand-500/20 active:scale-95 cursor-pointer"}`}
                          title={parentData.parentPayments.length === 0 ? "Aucun paiement à générer" : "Télécharger le reçu consolidé"}
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Télécharger PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
