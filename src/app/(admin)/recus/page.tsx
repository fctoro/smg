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
      
      return {
        key: p.email ? p.email.toLowerCase().trim() : `${p.nom} ${p.prenom}`.toLowerCase().trim(),
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        telephone: p.telephone,
        playerIds: pIds,
        parentPayments: parentPayments.sort((a, b) => {
          const dateA = a.datePaiement ? new Date(a.datePaiement).getTime() : 0;
          const dateB = b.datePaiement ? new Date(b.datePaiement).getTime() : 0;
          return dateB - dateA;
        }),
        totalPaye: totalPayeLabel,
      };
    });
  }, [parents, payments]);

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
    
    // Fonction sécurisée pour la devise dans le PDF
    const formatCurrencyPDF = (amountStr: string) => {
      return amountStr;
    };

    // ==========================================
    // EN-TÊTE
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("Reçu de Paiement", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("Reçu FC TORO", 14, 31);
    doc.text(`Numéro de reçu : ${receiptNo}`, 14, 36);

    // VRAI Logo FC TORO à droite
    // FC_TORO_LOGO est un PNG. On l'affiche avec une taille de 25x25 (ajustable)
    try {
      doc.addImage(FC_TORO_LOGO, 'PNG', 170, 12, 25, 25);
    } catch (e) {
      console.warn("Erreur chargement logo PDF", e);
    }

    // Ligne séparatrice
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // ==========================================
    // MÉTA INFOS (N° et Date)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Numéro de reçu", 14, 52);
    doc.text("Date d'émission", 100, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(receiptNo, 14, 58);
    doc.text(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), 100, 58);

    doc.line(14, 64, 196, 64);

    // ==========================================
    // ADRESSES (Émetteur et Client)
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(234, 88, 12); // Orange / Brand accent
    doc.text("Émetteur", 14, 76);
    doc.text("Client (Parent)", 100, 76);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("FC TORO", 14, 83);
    doc.text(parentFullName, 100, 83);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    
    // Infos FC TORO
    doc.text("Complexe Sportif", 14, 89);
    doc.text("Port-au-Prince, Haïti", 14, 94);
    doc.text("Téléphone: +509 37 21 41 89", 14, 99);
    doc.text("Email: info@fctoro.com", 14, 104);
    doc.text("Web: www.fctoro.com", 14, 109);

    // Infos Parent
    doc.text(`Téléphone: ${parentData.telephone || "Non renseigné"}`, 100, 89);
    doc.text(`Email: ${parentData.email || "Non renseigné"}`, 100, 94);
    doc.text(`Enfant(s) inscrit(s): ${parentData.playerIds.length}`, 100, 99);

    // ==========================================
    // MONTANT TOTAL MIS EN ÉVIDENCE
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Montant total payé", 14, 125);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 14, 134);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const confText = `Ce reçu confirme les paiements pour ${parentData.playerIds.length} joueur(s).`;
    const confWidth = doc.getTextWidth(confText);
    doc.text(confText, 196 - confWidth, 132);

    // ==========================================
    // TABLEAU DES VERSEMENTS
    // ==========================================
    const tableColumn = ["Date", "Joueur (Enfant)", "Remarque", "Mode", "Montant"];
    const tableRows: any[] = [];

    // Helper pour parser le Mode
    const mapMode = (mode: any) => {
      const modeStr = String(mode).toLowerCase();
      if (modeStr === "1") return "Espèces";
      if (modeStr === "2") return "Virement Bancaire";
      if (modeStr === "3") return "Chèque";
      if (modeStr === "4") return "Carte";
      if (modeStr === "5") return "Moncash";
      if (modeStr === "virement") return "Virement Bancaire";
      if (modeStr === "especes" || modeStr === "espèces") return "Espèces";
      return String(mode || "-");
    };

    parentData.parentPayments.forEach((p: any) => {
      const joueurObj = players.find(player => player.id === p.playerId);
      const joueurNom = joueurObj ? getPlayerFullName(joueurObj) : "Inconnu";
      
      const pData = [
        String(formatClubDate(p.datePaiement ?? "")),
        String(joueurNom),
        String(p.remarque || "Paiement de cotisation"),
        String(mapMode(p.methode)),
        String(formatCurrencyPDF(p.montant)),
      ];
      tableRows.push(pData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 145,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [255, 255, 255], textColor: [100, 116, 139], fontStyle: 'bold', lineWidth: { bottom: 0.5, top: 0.5 }, lineColor: [226, 232, 240] },
      bodyStyles: { textColor: [15, 23, 42] },
      columnStyles: {
        4: { fontStyle: 'bold', halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 145;

    // ==========================================
    // BOX TOTAL FINAL (Style TaïTaï)
    // ==========================================
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(100, finalY + 10, 96, 30, 'FD'); // Box pour le total

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Somme totale", 105, finalY + 20);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 191, finalY + 20, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(105, finalY + 25, 191, finalY + 25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Montant final", 105, finalY + 33);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 191, finalY + 33, { align: 'right' });

    // ==========================================
    // PIED DE PAGE
    // ==========================================
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Document officiel généré par le système d'administration du FC TORO.", 14, finalY + 60);
    doc.text("Merci pour votre confiance envers le club.", 14, finalY + 65);

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
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 text-gray-800 dark:bg-white/[0.02] dark:text-white/90 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Parent</th>
                  <th className="px-5 py-3.5 font-semibold">Contact</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Enfants Inscrits</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Total Payé</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Action</th>
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
