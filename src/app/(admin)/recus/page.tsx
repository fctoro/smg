"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { getParentLinkedPlayerIds } from "@/lib/club/parents";
import { FC_TORO_LOGO } from "@/lib/club/pdfAssets";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dropdown } from "@/components/ui/dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Pagination from "@/components/tables/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { Player } from "@/types/club";

export default function RecusPage() {
  const { parents, players, payments, hydrated } = useClubData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedChildrenCount, setSelectedChildrenCount] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid">("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const seasons = useMemo(
    () =>
      [...new Set(players.map((player) => player.saison).filter(Boolean))].sort(
        (a, b) => (b || "").localeCompare(a || ""),
      ),
    [players],
  );

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

    return Array.from(map.values()).map((p, index) => {
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

      const initials = (p.nom.charAt(0) + p.prenom.charAt(0)).toUpperCase() || "PT";
      const randomDigits = Math.floor(Math.random() * 90000) + 10000;
      const receiptNo = `RP-FCT-${initials}-${randomDigits}`;

      return {
        key: p.email ? p.email.toLowerCase().trim() : `${p.nom} ${p.prenom}`.toLowerCase().trim(),
        seqNo: index + 1,
        receiptNo,
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
        totalPayeUSD,
        totalPayeHTG,
        totalPaye: totalPayeLabel,
      };
    });
  }, [parents, payments, players]);

  // 2. Filtrer la liste globale
  const filteredParents = useMemo(() => {
    return uniqueParents.filter((p) => {
      const fullName = `${p.nom} ${p.prenom}`.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      
      // Filtrer par recherche textuelle (parent, email, téléphone ou enfants)
      const linkedPlayerNames = p.playerIds
        .map((playerId) => playerMap.get(playerId))
        .filter(Boolean)
        .map((player) => getPlayerFullName(player as Player).toLowerCase())
        .join(" ");

      const queryMatch = !query || fullName.includes(query) || p.email.toLowerCase().includes(query) || p.telephone.includes(query) || linkedPlayerNames.includes(query);
      if (!queryMatch) return false;

      // Filter par Onglet (Tous, Avec paiements, Sans paiement)
      if (activeTab === "paid" && p.parentPayments.length === 0) return false;
      if (activeTab === "unpaid" && p.parentPayments.length > 0) return false;

      // Filter par Nombre d'enfants
      const count = p.playerIds.length;
      if (selectedChildrenCount === "1" && count !== 1) return false;
      if (selectedChildrenCount === ">1" && count <= 1) return false;

      // Filter par Saison
      if (selectedSeason !== "all") {
        const hasSeasonMatch = p.playerIds.some((playerId) => {
          const player = playerMap.get(playerId);
          return player && player.saison === selectedSeason;
        });
        if (!hasSeasonMatch) return false;
      }

      return true;
    });
  }, [uniqueParents, searchQuery, activeTab, selectedChildrenCount, selectedSeason, playerMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredParents.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedParents = filteredParents.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  // Fonctions d'exportation CSV et Excel
  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ["N° Reçu", "Parent", "Téléphone", "Email", "Enfants Inscrits", "Nombre Paiements", "Total Payé"];
    let csvContent = headers.join(",") + "\n";
    filteredParents.forEach(p => {
      const linkedNames = p.playerIds.map(id => {
        const pl = playerMap.get(id);
        return pl ? getPlayerFullName(pl) : "";
      }).filter(Boolean).join(" ; ");

      const row = [p.receiptNo, `${p.nom} ${p.prenom}`, p.telephone || "", p.email || "", linkedNames, String(p.parentPayments.length), p.totalPaye];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "recus_parents.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!window.confirm("Voulez-vous vraiment exporter la liste des reçus parents au format Excel ?")) return;
    setIsExportOpen(false);
    const headers = ["N° Reçu", "Parent", "Téléphone", "Email", "Enfants Inscrits", "Nombre Paiements", "Total Payé"];
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    filteredParents.forEach(p => {
      const linkedNames = p.playerIds.map(id => {
        const pl = playerMap.get(id);
        return pl ? getPlayerFullName(pl) : "";
      }).filter(Boolean).join(" ; ");

      const row = [p.receiptNo, `${p.nom} ${p.prenom}`, p.telephone || "", p.email || "", linkedNames, String(p.parentPayments.length), p.totalPaye];
      const csvRow = row.map(field => `"${(field || "").toString().replace(/"/g, '""')}"`);
      csvContent += csvRow.join(";") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "recus_parents_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generation de Reçu PDF
  const handleGeneratePDF = (parentData: any) => {
    if (!parentData) return;

    const doc = new jsPDF();
    const parentFullName = `${parentData.nom} ${parentData.prenom}`;
    const receiptNo = parentData.receiptNo || `RP-FCTORO-0001`;
    
    const formatCurrencyPDF = (amountStr: string) => {
      return amountStr;
    };

    // Corporate Monochrome Palette
    const grayDark: [number, number, number] = [31, 41, 55];    // Charcoal
    const grayMedium: [number, number, number] = [107, 114, 128]; // Mid Gray
    const grayLight: [number, number, number] = [229, 231, 235];  // Light Gray
    const white: [number, number, number] = [255, 255, 255];
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
    doc.setFontSize(22);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("RP PARENTS", 196, 26, { align: 'right' });

    doc.setFontSize(10);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("N° Rapport :", 155, 34, { align: 'right' });
    
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

    if (parentData.parentPayments.length === 0) {
      const firstChild = players.find(player => parentData.playerIds.includes(player.id));
      const joueurNom = firstChild ? getPlayerFullName(firstChild) : "Aucun enfant associé";
      tableRows.push([
        "-",
        joueurNom,
        "Aucun versement enregistré",
        "-",
        formatClubCurrency(0, "US"),
      ]);
    } else {
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
    }

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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Sous-total", 110, finalY + 10);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 196, finalY + 10, { align: 'right' });

    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(100, finalY + 15, 196, finalY + 15);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("TOTAL PAYÉ", 110, finalY + 22);
    doc.text(formatCurrencyPDF(parentData.totalPaye), 196, finalY + 22, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("Merci de votre confiance.", 14, finalY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Signature autorisée", 14, finalY + 35);
    doc.line(14, finalY + 45, 60, finalY + 45);

    doc.save(`Rapport_Parents_${parentFullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="RP Parents" />

      {/* Barre d'outils et Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 grid-cols-1 sm:grid-cols-3 min-w-0">
          <div className="min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher (nom, email...)"
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div className="min-w-0">
            <select
              value={selectedChildrenCount}
              onChange={(event) => {
                setSelectedChildrenCount(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous (nombre d'enfants)</option>
              <option value="1">1 enfant</option>
              <option value=">1">Plus d'1 enfant</option>
            </select>
          </div>
          <div className="min-w-0">
            <select
              value={selectedSeason}
              onChange={(event) => {
                setSelectedSeason(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes les saisons</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {String(season).toLowerCase().startsWith('saison') ? season : `Saison ${season}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteneur principal de la table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Liste des RP Parents
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredParents.length} compte(s) parent(s) trouvé(s)
            </p>
          </div>

          {/* Bouton d'exportation Excel / CSV */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M8 13h2"></path>
                <path d="M14 13h2"></path>
                <path d="M8 17h2"></path>
                <path d="M14 17h2"></path>
              </svg>
              Exporter Excel / CSV
            </button>
            <Dropdown
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              className="absolute right-0 top-full mt-1 w-40 z-30"
            >
              <DropdownItem
                onItemClick={handleExportExcel}
                className="cursor-pointer"
              >
                Excel
              </DropdownItem>
              <DropdownItem
                onItemClick={handleExportCSV}
                className="cursor-pointer"
              >
                CSV
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* Onglets de filtrage par statut de paiement */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 mb-4 overflow-x-auto">
          <button
            onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Tous ({uniqueParents.length})
          </button>
          <button
            onClick={() => { setActiveTab("paid"); setCurrentPage(1); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "paid"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Avec paiements ({uniqueParents.filter(p => p.parentPayments.length > 0).length})
          </button>
          <button
            onClick={() => { setActiveTab("unpaid"); setCurrentPage(1); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "unpaid"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Sans versement ({uniqueParents.filter(p => p.parentPayments.length === 0).length})
          </button>
        </div>

        {/* Tableau stylisé */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  N° Rapport
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Parent
                </TableCell>
                <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Contact
                </TableCell>
                <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Enfants Inscrits
                </TableCell>
                <TableCell isHeader className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Total Payé
                </TableCell>
                <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-28 whitespace-nowrap">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!hydrated ? (
                <TableBodySkeleton rows={6} columns={6} />
              ) : pagedParents.length === 0 ? (
                <TableRow>
                  <td colSpan={6} className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                    Aucun compte parent trouvé pour ces critères.
                  </td>
                </TableRow>
              ) : (
                pagedParents.map((parentData) => (
                  <TableRow key={parentData.key} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <TableCell className="py-3 text-theme-sm font-mono font-medium text-brand-600 dark:text-brand-400">
                      {parentData.receiptNo}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-900 dark:text-white font-semibold">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span>{parentData.nom} {parentData.prenom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{parentData.telephone || "Aucun tél"}</span>
                        <span className="text-gray-500 truncate max-w-[200px]">{parentData.email || "Aucun email"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-center">
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                        {parentData.playerIds.length} enfant(s)
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-right font-bold text-gray-900 dark:text-white">
                      {parentData.totalPaye}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-center">
                      <button
                        onClick={() => handleGeneratePDF(parentData)}
                        className="inline-flex items-center justify-center text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition cursor-pointer p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10"
                        aria-label="Télécharger le reçu PDF"
                        title="Télécharger le reçu (PDF)"
                      >
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination à la fin du tableau */}
        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={currentPageSafe}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={currentPageSize}
            onPageSizeChange={(size) => {
              setCurrentPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
