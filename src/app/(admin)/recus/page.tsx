"use client";

import React, { useState, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import { formatClubCurrency, formatClubDate, getPlayerFullName } from "@/lib/club/metrics";
import { FC_TORO_LOGO, OCTACORE_LOGO } from "@/lib/club/pdfAssets";
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
import { useConfirm } from "@/hooks/useConfirm";

function getDeterministicDigits(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash) % 90000 + 10000);
}

export default function RecusJoueursPage() {
  const { players, payments, hydrated } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid">("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const categories = useMemo(
    () =>
      [...new Set(players.map((player) => player.categorie).filter(Boolean))].sort(
        (a, b) => (a || "").localeCompare(b || ""),
      ),
    [players],
  );

  const seasons = useMemo(
    () =>
      [...new Set(players.map((player) => player.saison).filter(Boolean))].sort(
        (a, b) => (b || "").localeCompare(a || ""),
      ),
    [players],
  );

  // 1. Transformer les données par Joueur avec leurs paiements associés
  const uniquePlayersData = useMemo(() => {
    return players.map((player, index) => {
      const playerPayments = payments.filter((pay) => pay.playerId === player.id);
      
      const totalPayeUSD = playerPayments
        .filter((p) => p.devise !== "HTG")
        .reduce((sum, pay) => sum + (pay.montant || 0), 0);
      const totalPayeHTG = playerPayments
        .filter((p) => p.devise === "HTG")
        .reduce((sum, pay) => sum + (pay.montant || 0), 0);

      const totalPayeLabel =
        [
          totalPayeUSD > 0 ? formatClubCurrency(totalPayeUSD, "US") : null,
          totalPayeHTG > 0 ? formatClubCurrency(totalPayeHTG, "HTG") : null,
        ]
          .filter(Boolean)
          .join(" / ") || formatClubCurrency(0, "US");

      const initials = (
        (player.nom?.charAt(0) || player.prenom?.charAt(0) || "J")
      ).toUpperCase();
      const digits = player.matricule
        ? player.matricule.replace(/\D/g, "").slice(-5) || getDeterministicDigits(player.id)
        : getDeterministicDigits(player.id);
      const receiptNo = `RP-FCT-${initials}-${digits}`;

      const sortedPayments = [...playerPayments].sort((a, b) => {
        const dateA = a.datePaiement ? new Date(a.datePaiement).getTime() : 0;
        const dateB = b.datePaiement ? new Date(b.datePaiement).getTime() : 0;
        return dateB - dateA;
      });

      return {
        key: player.id,
        seqNo: index + 1,
        receiptNo,
        player,
        nom: player.nom,
        prenom: player.prenom,
        fullName: getPlayerFullName(player),
        matricule: player.matricule || "",
        categorie: player.categorie || "",
        programme: player.programme || "",
        saison: player.saison || "",
        photoUrl: player.photoIdentiteUrl || player.photoUrl || "",
        parentNomPrenom: player.parentNomPrenom || "",
        parentTelephone: player.parentTelephone || player.telephone || "",
        parentEmail: player.parentEmail || player.email || "",
        parentAdresse: player.parentAdresse || player.adresse || "",
        playerPayments: sortedPayments,
        totalPayeUSD,
        totalPayeHTG,
        totalPaye: totalPayeLabel,
      };
    });
  }, [players, payments]);

  // 2. Filtrer la liste des joueurs
  const filteredPlayers = useMemo(() => {
    return uniquePlayersData.filter((p) => {
      const query = searchQuery.trim().toLowerCase();

      const queryMatch =
        !query ||
        p.fullName.toLowerCase().includes(query) ||
        p.receiptNo.toLowerCase().includes(query) ||
        p.matricule.toLowerCase().includes(query) ||
        p.parentNomPrenom.toLowerCase().includes(query) ||
        p.parentEmail.toLowerCase().includes(query) ||
        p.parentTelephone.includes(query) ||
        p.categorie.toLowerCase().includes(query);

      if (!queryMatch) return false;

      // Filtre par onglet (Tous, Avec paiements, Sans versement)
      if (activeTab === "paid" && p.playerPayments.length === 0) return false;
      if (activeTab === "unpaid" && p.playerPayments.length > 0) return false;

      // Filtre par catégorie
      if (selectedCategory !== "all" && p.categorie !== selectedCategory) {
        return false;
      }

      // Filtre par saison
      if (selectedSeason !== "all" && p.saison !== selectedSeason) {
        return false;
      }

      return true;
    });
  }, [uniquePlayersData, searchQuery, activeTab, selectedCategory, selectedSeason]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / currentPageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedPlayers = filteredPlayers.slice(
    (currentPageSafe - 1) * currentPageSize,
    currentPageSafe * currentPageSize,
  );

  // Fonctions d'exportation CSV et Excel
  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des RP Joueurs au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        const headers = [
          "N° Rapport",
          "Matricule",
          "Joueur",
          "Catégorie",
          "Programme",
          "Nombre Versements",
          "Total Payé",
        ];
        let csvContent = headers.join(",") + "\n";
        filteredPlayers.forEach((p) => {
          const row = [
            p.receiptNo,
            p.matricule,
            p.fullName,
            p.categorie,
            p.programme,
            String(p.playerPayments.length),
            p.totalPaye,
          ];
          const csvRow = row.map(
            (field) => `"${(field || "").toString().replace(/"/g, '""')}"`,
          );
          csvContent += csvRow.join(",") + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `rp_joueurs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message: "Voulez-vous vraiment exporter la liste des RP Joueurs au format Excel ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        const headers = [
          "N° Rapport",
          "Matricule",
          "Joueur",
          "Catégorie",
          "Programme",
          "Nombre Versements",
          "Total Payé",
        ];
        
        const thead = headers.map(h => `<th>${h}</th>`).join("");
        const tbody = filteredPlayers.map((p) => {
          const row = [
            p.receiptNo,
            p.matricule,
            p.fullName,
            p.categorie,
            p.programme,
            String(p.playerPayments.length),
            p.totalPaye,
          ];
          return `<tr>${row.map(field => `<td>${(field || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
        }).join("");

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <style>
              table { border-collapse: collapse; }
              td, th { border: 1px solid #dddddd; padding: 4px; }
              th { background-color: #f2f2f2; font-weight: bold; }
            </style>
          </head>
          <body>
            <table>
              <thead><tr>${thead}</tr></thead>
              <tbody>${tbody}</tbody>
            </table>
          </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `rp_joueurs_${new Date().toISOString().slice(0, 10)}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  // Génération de Rapport RP Joueur PDF
  const handleGeneratePDF = (playerData: any) => {
    if (!playerData) return;

    const doc = new jsPDF();
    const playerFullName = playerData.fullName || "Joueur";
    const receiptNo = playerData.receiptNo || `RP-FCT-0001`;

    const grayDark: [number, number, number] = [31, 41, 55];
    const grayMedium: [number, number, number] = [107, 114, 128];
    const grayLight: [number, number, number] = [229, 231, 235];
    const black: [number, number, number] = [0, 0, 0];

    try {
      doc.addImage(FC_TORO_LOGO, "PNG", 14, 15, 25, 25);
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
    doc.setFontSize(20);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("RP JOUEUR", 196, 26, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("N° Rapport :", 155, 34, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(receiptNo, 196, 34, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Date :", 155, 39, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(
      new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      196,
      39,
      { align: "right" },
    );

    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 196, 48);

    const headerTextColor: [number, number, number] = [82, 107, 132];
    const headerLineColor: [number, number, number] = [226, 232, 240];

    // Section 1: Informations Joueur
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.text("INFORMATIONS DU JOUEUR", 14, 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(playerFullName, 14, 66);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    if (playerData.matricule) {
      doc.text(`Matricule : ${playerData.matricule}`, 14, 72);
    }
    doc.text(`Catégorie : ${playerData.categorie || "Non spécifiée"}`, 14, playerData.matricule ? 77 : 72);
    if (playerData.programme) {
      doc.text(`Programme : ${playerData.programme}`, 14, playerData.matricule ? 82 : 77);
    }

    // Section 2: Informations Parent / Responsable
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.text("PARENT / RESPONSABLE", 120, 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(playerData.parentNomPrenom || "Non renseigné", 120, 66);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text(`Tél : ${playerData.parentTelephone || "-"}`, 120, 72);
    doc.text(`Email : ${playerData.parentEmail || "-"}`, 120, 78);
    if (playerData.parentAdresse) {
      const shortAddress =
        playerData.parentAdresse.length > 40
          ? playerData.parentAdresse.substring(0, 37) + "..."
          : playerData.parentAdresse;
      doc.text(`Adresse : ${shortAddress}`, 120, 84);
    }

    const tableStartY = 95;
    const tableColumn = ["Date", "Description / Rubrique", "Mode", "Montant"];
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
      let cleaned = remark.replace(/\[.*?\]\s*/g, "").trim();
      cleaned = cleaned.replace(/\s*\|\s*/g, "\n");
      cleaned = cleaned.replace(/\s*Plan:\s*/g, "\nPlan : ");
      cleaned = cleaned.replace(/Rubriques\s*:\s*/gi, "");
      cleaned = cleaned.replace(/Rubriques:\s*/gi, "");
      if (cleaned.includes("•")) {
        cleaned = cleaned.replace(/,\s*/g, "\n• ");
      }
      return cleaned.trim() || "Paiement de cotisation";
    };

    if (playerData.playerPayments.length === 0) {
      tableRows.push([
        "-",
        "Aucun versement enregistré",
        "-",
        formatClubCurrency(0, "US"),
      ]);
    } else {
      playerData.playerPayments.forEach((p: any) => {
        const montantDisplay =
          p.devise === "HTG"
            ? formatClubCurrency(p.montant, "HTG")
            : formatClubCurrency(p.montant, "US");

        tableRows.push([
          String(formatClubDate(p.datePaiement ?? "")),
          cleanRemarkForPDF(p.remarque),
          String(mapMode(p.methode)),
          String(montantDisplay),
        ]);
      });
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      },
      headStyles: {
        fillColor: false,
        textColor: headerTextColor,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: { textColor: grayDark },
      columnStyles: {
        0: { cellWidth: 26, halign: "left" },
        1: { cellWidth: "auto", halign: "left" },
        2: { cellWidth: 26, halign: "left" },
        3: { cellWidth: 32, fontStyle: "bold", halign: "right" },
      },
      didParseCell: function (data: any) {
        if (data.section === "head" && data.column.index === 3) {
          data.cell.styles.halign = "right";
        }
      },
      didDrawCell: function (data: any) {
        if (data.section === "head") {
          doc.setDrawColor(
            headerLineColor[0],
            headerLineColor[1],
            headerLineColor[2],
          );
          doc.setLineWidth(0.3);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y,
          );
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height,
          );
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || tableStartY;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Sous-total", 110, finalY + 10);
    doc.text(playerData.totalPaye, 196, finalY + 10, { align: "right" });

    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(100, finalY + 15, 196, finalY + 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("TOTAL PAYÉ", 110, finalY + 22);
    doc.text(playerData.totalPaye, 196, finalY + 22, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("Merci de votre confiance.", 14, finalY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("Signature autorisée", 14, finalY + 35);
    doc.line(14, finalY + 45, 60, finalY + 45);

    // --- Footer Branding Octacore appliqué sur TOUTES les pages ---
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

    doc.save(
      `Rapport_Joueur_${playerFullName.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`,
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="RP Joueurs" />

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
              placeholder="Rechercher (joueur, parent, matricule...)"
              className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div className="min-w-0">
            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
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
                  {String(season).toLowerCase().startsWith("saison")
                    ? season
                    : `Saison ${season}`}
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
              Liste des RP Joueurs
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredPlayers.length} joueur(s) trouvé(s)
            </p>
          </div>

          {/* Bouton d'exportation Excel / CSV */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
            onClick={() => {
              setActiveTab("all");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Tous ({uniquePlayersData.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("paid");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "paid"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Avec paiements (
            {uniquePlayersData.filter((p) => p.playerPayments.length > 0).length})
          </button>
          <button
            onClick={() => {
              setActiveTab("unpaid");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "unpaid"
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Sans versement (
            {uniquePlayersData.filter((p) => p.playerPayments.length === 0).length})
          </button>
        </div>

        {/* Tableau des RP Joueurs */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  N° Rapport
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Joueur
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Parent / Contact
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Paiements
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Total Payé
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-28 whitespace-nowrap"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!hydrated ? (
                <TableBodySkeleton rows={6} columns={6} />
              ) : pagedPlayers.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucun joueur trouvé pour ces critères.
                  </td>
                </TableRow>
              ) : (
                pagedPlayers.map((playerData) => (
                  <TableRow
                    key={playerData.key}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="py-3 text-theme-sm font-mono font-medium text-brand-600 dark:text-brand-400">
                      {playerData.receiptNo}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-900 dark:text-white font-semibold">
                      <div className="flex items-center gap-3">
                        {playerData.photoUrl ? (
                          <img
                            src={playerData.photoUrl}
                            alt={playerData.fullName}
                            className="h-9 w-9 shrink-0 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              e.currentTarget.src = "/images/user/silhouette.svg";
                            }}
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold text-xs">
                            {(playerData.prenom?.charAt(0) || "") +
                              (playerData.nom?.charAt(0) || "")}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {playerData.fullName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {playerData.categorie ? `${playerData.categorie}` : "Sans catégorie"}
                            {playerData.programme ? ` · ${playerData.programme}` : ""}
                            {playerData.matricule ? ` · #${playerData.matricule}` : ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {playerData.parentNomPrenom || "Non renseigné"}
                        </span>
                        <span className="text-gray-500">
                          {playerData.parentTelephone || "Aucun tél"}
                        </span>
                        {playerData.parentEmail && (
                          <span className="text-gray-400 truncate max-w-[180px]">
                            {playerData.parentEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-center">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        playerData.playerPayments.length > 0
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {playerData.playerPayments.length} versement(s)
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-right font-bold text-gray-900 dark:text-white">
                      {playerData.totalPaye}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-center">
                      <button
                        onClick={() => handleGeneratePDF(playerData)}
                        className="inline-flex items-center justify-center text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition cursor-pointer p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10"
                        aria-label="Télécharger le rapport RP Joueur (PDF)"
                        title="Télécharger le rapport RP Joueur (PDF)"
                      >
                        <svg
                          className="size-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
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
      <ConfirmComponent />
    </div>
  );
}
