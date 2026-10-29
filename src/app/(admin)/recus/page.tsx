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
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { DownloadIcon, DollarLineIcon, CheckCircleIcon } from "@/icons";

function getDeterministicDigits(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return String((Math.abs(hash) % 90000) + 10000);
}

export default function EtatDeCompteJoueursPage() {
  const { players, payments, hydrated } = useClubData();
  const { confirm, ConfirmComponent } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid" | "transactions">("all");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(100);

  // États pour l'onglet Transactions
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [txDevise, setTxDevise] = useState<"all" | "US" | "HTG">("all");
  const [txMethod, setTxMethod] = useState<string>("all");
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const [txCurrentPageSize, setTxCurrentPageSize] = useState(50);

  // 1. Uniquement les joueurs actifs (Exclure les Alumni et Inactifs)
  const activePlayers = useMemo(() => {
    return players.filter((player) => {
      const status = (player.statut || "").toLowerCase();
      const statutJoueur = (player.statutJoueur || "").toLowerCase();
      return status !== "alumni" && status !== "inactif" && statutJoueur !== "inactif";
    });
  }, [players]);

  const categories = useMemo(
    () =>
      [...new Set(activePlayers.map((player) => player.categorie).filter(Boolean))].sort(
        (a, b) => (a || "").localeCompare(b || ""),
      ),
    [activePlayers],
  );

  const seasons = useMemo(() => {
    const list: string[] = [];
    activePlayers.forEach((player) => {
      if (player.saison) list.push(player.saison);
      if (player.saisons && Array.isArray(player.saisons)) {
        list.push(...player.saisons);
      }
    });
    return [...new Set(list.filter(Boolean))].sort((a, b) => (b || "").localeCompare(a || ""));
  }, [activePlayers]);

  // 2. Transformer les données des Joueurs Actifs avec leur État de Compte et Solde
  const uniquePlayersData = useMemo(() => {
    return activePlayers.map((player, index) => {
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

      // 1. Check if Boursier
      const playerStatusStr = String((player as any).statutJoueur || player.statut || "").toLowerCase();
      const isBoursier = (playerStatusStr.includes("bourse") && !playerStatusStr.includes("demi")) || playerPayments.some(p => String(p.remarque || "").toLowerCase().includes("[plan:boursier]"));

      // 2. Extract Total Due & Plan from Payment Tags ([TOTAL_DUE:XXXX])
      let totalDueFromPaymentsUSD = 0;
      let detectedPlan = "";
      playerPayments.forEach((p) => {
        const remark = String(p.remarque || "");
        const match = remark.match(/\[TOTAL_DUE:\s*([\d.]+)\s*\]/i);
        if (match && match[1]) {
          const due = parseFloat(match[1]);
          if (!isNaN(due) && due > totalDueFromPaymentsUSD) {
            totalDueFromPaymentsUSD = due;
          }
        }
        const planMatch = remark.match(/\[PLAN:\s*([A-Z_]+)\s*\]/i);
        if (planMatch && planMatch[1]) {
          detectedPlan = planMatch[1].toLowerCase();
        }
      });

      // 3. Determine Expected Fee
      const feeCurrency: "US" | "HTG" = player.cotisationDevise || "US";
      let expectedFee = 0;

      if (isBoursier) {
        expectedFee = 0;
      } else if (totalDueFromPaymentsUSD > 0) {
        expectedFee = totalDueFromPaymentsUSD;
      } else if (player.cotisationMontant && player.cotisationMontant > 0) {
        expectedFee = player.cotisationMontant;
      } else {
        // Fallback based on category/programme & plan
        const cat = String(player.categorie || player.programme || "").toLowerCase();
        const isTiToro = cat.includes("ti");
        if (detectedPlan.includes("annuel") || String(player.planPaiement || "").toLowerCase().includes("annuel")) {
          expectedFee = isTiToro ? 900 : 1215;
        } else if (detectedPlan.includes("semestriel") || String(player.planPaiement || "").toLowerCase().includes("semestriel")) {
          expectedFee = isTiToro ? 950 : 1282.50;
        } else if (detectedPlan.includes("mensuel") || String(player.planPaiement || "").toLowerCase().includes("mensuel")) {
          expectedFee = isTiToro ? 1035 : 1395;
        } else {
          expectedFee = isTiToro ? 1000 : 1350;
        }
      }

      const expectedFeeLabel = isBoursier
        ? "Boursier (0.00 US$)"
        : expectedFee > 0
        ? formatClubCurrency(expectedFee, feeCurrency)
        : "Non spécifiée";

      // 4. Balance calculation
      let soldeUSD = 0;
      let soldeHTG = 0;

      if (isBoursier) {
        soldeUSD = 0;
        soldeHTG = 0;
      } else if (feeCurrency === "HTG") {
        soldeHTG = Math.max(0, Math.round((expectedFee - totalPayeHTG) * 100) / 100);
      } else {
        soldeUSD = Math.max(0, Math.round((expectedFee - totalPayeUSD) * 100) / 100);
      }

      const soldeLabel = isBoursier
        ? "0.00 US$"
        : feeCurrency === "HTG"
        ? formatClubCurrency(soldeHTG, "HTG")
        : formatClubCurrency(soldeUSD, "US");

      const isPaidInFull = isBoursier || (feeCurrency === "HTG" ? soldeHTG <= 0.01 : soldeUSD <= 0.01);

      const initials = (
        (player.nom?.charAt(0) || player.prenom?.charAt(0) || "J")
      ).toUpperCase();
      const digits = player.matricule
        ? player.matricule.replace(/\D/g, "").slice(-5) || getDeterministicDigits(player.id)
        : getDeterministicDigits(player.id);
      const receiptNo = `EC-FCT-${initials}-${digits}`;

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
        expectedFee,
        feeCurrency,
        expectedFeeLabel,
        soldeUSD,
        soldeHTG,
        soldeLabel,
        isPaidInFull,
      };
    }).sort((a, b) => {
      const nomA = (a.nom || "").trim();
      const nomB = (b.nom || "").trim();
      const nomCompare = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
      if (nomCompare !== 0) return nomCompare;
      return (a.prenom || "").trim().localeCompare((b.prenom || "").trim(), "fr", { sensitivity: "base" });
    });
  }, [activePlayers, payments]);

  // 3. Filtrer la liste par recherche, onglets (À jour / Solde restant) et catégories
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

      // Filtre par onglet (Tous, À jour, Solde restant)
      if (activeTab === "paid" && !p.isPaidInFull) return false;
      if (activeTab === "unpaid" && p.isPaidInFull) return false;

      // Filtre par catégorie
      if (selectedCategory !== "all" && p.categorie !== selectedCategory) {
        return false;
      }

      // Filtre par saison
      if (selectedSeason !== "all") {
        const normalizeSeason = (s: string) => String(s || "").replace(/^saison\s*/i, "").trim().toLowerCase();
        const targetSeasonNorm = normalizeSeason(selectedSeason);
        const seasonMatches =
          p.saison === selectedSeason ||
          (p.saison && normalizeSeason(p.saison) === targetSeasonNorm) ||
          (p.player?.saisons && p.player.saisons.some(s => s === selectedSeason || normalizeSeason(s) === targetSeasonNorm));
        if (!seasonMatches) return false;
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

  // Dictionnaire des joueurs pour l'onglet Transactions
  const playerMap = useMemo(() => {
    const map = new Map<string, any>();
    players.forEach((p) => {
      map.set(String(p.id), p);
    });
    return map;
  }, [players]);

  // Raccourcis de dates rapides pour les transactions
  const setQuickTxDate = (type: "today" | "week" | "month" | "year" | "all") => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (type === "today") {
      setTxDateFrom(todayStr);
      setTxDateTo(todayStr);
    } else if (type === "week") {
      const start = new Date(today);
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1);
      const sY = start.getFullYear();
      const sM = String(start.getMonth() + 1).padStart(2, "0");
      const sD = String(start.getDate()).padStart(2, "0");
      setTxDateFrom(`${sY}-${sM}-${sD}`);
      setTxDateTo(todayStr);
    } else if (type === "month") {
      setTxDateFrom(`${yyyy}-${mm}-01`);
      setTxDateTo(todayStr);
    } else if (type === "year") {
      setTxDateFrom(`${yyyy}-01-01`);
      setTxDateTo(`${yyyy}-12-31`);
    } else {
      setTxDateFrom("");
      setTxDateTo("");
    }
    setTxCurrentPage(1);
  };

  // Filtrage strict des transactions
  const filteredTransactions = useMemo(() => {
    return payments.filter((p) => {
      const dt = p.datePaiement || (p as any).dateTransact || (p as any).dtCreation || (p.periode ? `${p.periode}-01` : "");
      const dayStr = dt ? String(dt).slice(0, 10) : "";

      if (txDateFrom && dayStr && dayStr < txDateFrom) return false;
      if (txDateTo && dayStr && dayStr > txDateTo) return false;

      // Filtre devise
      const effectiveDevise = (Number(p.montantHTG) > 0 || p.devise === "HTG") ? "HTG" : "US";
      if (txDevise !== "all" && effectiveDevise !== txDevise) return false;

      // Filtre méthode de paiement
      if (txMethod !== "all" && String(p.methode).toLowerCase() !== txMethod.toLowerCase()) return false;

      // Filtre textuel
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase().trim();
        const pl = playerMap.get(String(p.playerId));
        const plName = pl ? `${pl.prenom} ${pl.nom}`.toLowerCase() : "";
        const mat = (pl?.matricule || "").toLowerCase();
        const recu = String((p as any).numeroRecu || (p as any).recuNo || p.id || "").toLowerCase();
        const rem = String(p.remarque || "").toLowerCase();
        if (!plName.includes(q) && !mat.includes(q) && !recu.includes(q) && !rem.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, txDateFrom, txDateTo, txDevise, txMethod, txSearchQuery, playerMap]);

  // Totaux financiers des transactions filtrées
  const txTotals = useMemo(() => {
    let usd = 0;
    let htg = 0;
    let validCount = 0;

    filteredTransactions.forEach((p) => {
      if (p.statut === "paid") {
        usd += Number(p.montantUS) || (p.devise === "US" ? Number(p.montant) || 0 : 0);
        htg += Number(p.montantHTG) || (p.devise === "HTG" ? Number(p.montant) || 0 : 0);
        validCount++;
      }
    });

    return {
      totalUSD: Math.round(usd * 100) / 100,
      totalHTG: Math.round(htg * 100) / 100,
      validCount,
      totalCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Pagination des transactions
  const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / txCurrentPageSize));
  const txCurrentPageSafe = Math.min(txCurrentPage, txTotalPages);
  const pagedTransactions = filteredTransactions.slice(
    (txCurrentPageSafe - 1) * txCurrentPageSize,
    txCurrentPageSafe * txCurrentPageSize,
  );

  const handlePrintTransactions = () => {
    window.print();
  };

  const handleExportTransactionsPDF = () => {
    if (filteredTransactions.length === 0) return;

    const doc = new jsPDF("landscape");
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = txDateFrom || "Début";
    const endStr = txDateTo || todayStr;

    try {
      if (FC_TORO_LOGO) {
        doc.addImage(FC_TORO_LOGO, "PNG", 14, 10, 18, 18, undefined, "FAST");
      }
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(31, 41, 55);
    doc.text("FC TORO — JOURNAL GÉNÉRAL DES TRANSACTIONS", 36, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Période : du ${startStr} au ${endStr} • Relevé officiel des règlements`, 36, 23);
    doc.text(`Total : ${txTotals.validCount} validé(s) sur ${txTotals.totalCount} • USD: ${formatClubCurrency(txTotals.totalUSD, "US")} • HTG: ${formatClubCurrency(txTotals.totalHTG, "HTG")}`, 36, 28);

    const tableRows = filteredTransactions.map((p) => {
      const pl = playerMap.get(String(p.playerId));
      const pName = pl ? `${pl.prenom} ${pl.nom}` : `Joueur #${p.playerId}`;
      const mat = pl?.matricule || "-";
      const cat = pl?.categorie || "-";
      const dt = p.datePaiement || (p as any).dateTransact || p.periode || "-";
      const recu = (p as any).numeroRecu || (p as any).recuNo || `REC-${p.id}`;
      const mode = p.methode || "Standard";
      const u = Number(p.montantUS) || 0;
      const h = Number(p.montantHTG) || 0;
      const mntUS = u > 0 ? formatClubCurrency(u, "US") : "-";
      const mntHTG = h > 0 ? formatClubCurrency(h, "HTG") : "-";
      const st = p.statut === "paid" ? "Payé" : (p.statut || "En attente");

      return [dt, recu, pName, mat, cat, mode, mntUS, mntHTG, st];
    });

    autoTable(doc, {
      startY: 33,
      head: [["Date", "N° Reçu", "Joueur", "Matricule", "Catégorie", "Mode", "Montant USD", "Montant HTG", "Statut"]],
      body: tableRows,
      theme: "striped",
      headStyles: {
        fillColor: [16, 124, 65],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      foot: [[
        "TOTAL DE LA SÉLECTION",
        "",
        "",
        "",
        "",
        `${txTotals.validCount} validé(s)`,
        formatClubCurrency(txTotals.totalUSD, "US"),
        formatClubCurrency(txTotals.totalHTG, "HTG"),
        ""
      ]],
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [17, 24, 39],
        fontStyle: "bold",
        fontSize: 8,
      },
    });

    doc.save(`journal_transactions_fctoro_${startStr}_au_${endStr}.pdf`);
  };

  // Fonctions d'exportation CSV et Excel
  const handleExportCSV = () => {
    setIsExportOpen(false);
    confirm({
      title: "Exporter la liste",
      message:
        activeTab === "transactions"
          ? "Voulez-vous vraiment exporter le Journal des Transactions au format CSV ?"
          : "Voulez-vous vraiment exporter l'État de Compte des Joueurs Actifs au format CSV ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        if (activeTab === "transactions") {
          const headers = [
            "Date",
            "N° Reçu",
            "Joueur",
            "Matricule",
            "Catégorie",
            "Programme",
            "Mode de Paiement",
            "Devise",
            "Montant USD",
            "Montant HTG",
            "Statut",
            "Remarque",
          ];
          let csvContent = "\uFEFF" + headers.join(",") + "\n";
          filteredTransactions.forEach((p) => {
            const pl = playerMap.get(String(p.playerId));
            const pName = pl ? `${pl.prenom} ${pl.nom}` : `Joueur #${p.playerId}`;
            const mat = pl?.matricule || "";
            const cat = pl?.categorie || "";
            const prog = pl?.programme || "FC Toro";
            const dt = p.datePaiement || (p as any).dateTransact || p.periode || "";
            const recu = (p as any).numeroRecu || (p as any).recuNo || `REC-${p.id}`;
            const mode = p.methode || "Standard";
            const u = Number(p.montantUS) || 0;
            const h = Number(p.montantHTG) || 0;
            const dev = p.devise || (h > 0 ? "HTG" : "US");
            const st = p.statut === "paid" ? "Payé" : (p.statut || "En attente");
            const rem = p.remarque || "";

            const row = [
              dt,
              recu,
              pName,
              mat,
              cat,
              prog,
              mode,
              dev,
              u > 0 ? u.toFixed(2) : "0.00",
              h > 0 ? h.toFixed(2) : "0.00",
              st,
              rem,
            ];
            const csvRow = row.map(
              (field) => `"${(field || "").toString().replace(/"/g, '""')}"`,
            );
            csvContent += csvRow.join(",") + "\n";
          });

          csvContent += `\nTOTAL,,,,"TOTAL DES VERSEMENTS",,,${txTotals.totalUSD.toFixed(2)} USD,${txTotals.totalHTG.toFixed(2)} HTG,VALIDES\n`;

          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `journal_transactions_fctoro_${new Date().toISOString().slice(0, 10)}.csv`,
          );
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }

        const headers = [
          "N° État de Compte",
          "Matricule",
          "Joueur",
          "Catégorie",
          "Programme",
          "Cotisation Prévue",
          "Total Payé",
          "Solde Restant",
          "Statut Financier",
        ];
        let csvContent = headers.join(",") + "\n";
        filteredPlayers.forEach((p) => {
          const row = [
            p.receiptNo,
            p.matricule,
            p.fullName,
            p.categorie,
            p.programme,
            p.expectedFeeLabel,
            p.totalPaye,
            p.soldeLabel,
            p.isPaidInFull ? "À jour" : "Solde Restant",
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
        link.setAttribute("download", `etat_de_compte_joueurs_${new Date().toISOString().slice(0, 10)}.csv`);
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
      message:
        activeTab === "transactions"
          ? "Voulez-vous vraiment exporter le Journal des Transactions au format Excel ?"
          : "Voulez-vous vraiment exporter l'État de Compte des Joueurs Actifs au format Excel ?",
      confirmText: "Exporter",
      cancelText: "Annuler",
      onConfirm: () => {
        if (activeTab === "transactions") {
          const headers = [
            "Date",
            "N° Reçu",
            "Joueur",
            "Matricule",
            "Catégorie",
            "Programme",
            "Mode de Paiement",
            "Devise",
            "Montant USD",
            "Montant HTG",
            "Statut",
            "Remarque",
          ];
          const thead = headers.map((h) => `<th>${h}</th>`).join("");
          const tbody = filteredTransactions
            .map((p) => {
              const pl = playerMap.get(String(p.playerId));
              const pName = pl ? `${pl.prenom} ${pl.nom}` : `Joueur #${p.playerId}`;
              const mat = pl?.matricule || "";
              const cat = pl?.categorie || "";
              const prog = pl?.programme || "FC Toro";
              const dt = p.datePaiement || (p as any).dateTransact || p.periode || "";
              const recu = (p as any).numeroRecu || (p as any).recuNo || `REC-${p.id}`;
              const mode = p.methode || "Standard";
              const u = Number(p.montantUS) || 0;
              const h = Number(p.montantHTG) || 0;
              const dev = p.devise || (h > 0 ? "HTG" : "US");
              const st = p.statut === "paid" ? "Payé" : (p.statut || "En attente");
              const rem = p.remarque || "";

              const row = [
                dt,
                recu,
                pName,
                mat,
                cat,
                prog,
                mode,
                dev,
                u > 0 ? u.toFixed(2) : "0.00",
                h > 0 ? h.toFixed(2) : "0.00",
                st,
                rem,
              ];
              return `<tr>${row.map((field) => `<td>${(field || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
            })
            .join("");

          const tfoot = `<tr><th colspan="8" style="text-align:right;">TOTAL :</th><th>${txTotals.totalUSD.toFixed(2)} USD</th><th>${txTotals.totalHTG.toFixed(2)} HTG</th><th colspan="2"></th></tr>`;

          const htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8" />
              <style>
                table { border-collapse: collapse; width: 100%; }
                td, th { border: 1px solid #dddddd; padding: 6px; text-align: left; }
                th { background-color: #107C41; color: white; font-weight: bold; }
              </style>
            </head>
            <body>
              <table>
                <thead><tr>${thead}</tr></thead>
                <tbody>${tbody}</tbody>
                <tfoot>${tfoot}</tfoot>
              </table>
            </body>
            </html>
          `;
          const blob = new Blob([htmlContent], {
            type: "application/vnd.ms-excel;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `journal_transactions_fctoro_${new Date().toISOString().slice(0, 10)}.xls`,
          );
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }

        const headers = [
          "N° État de Compte",
          "Matricule",
          "Joueur",
          "Catégorie",
          "Programme",
          "Cotisation Prévue",
          "Total Payé",
          "Solde Restant",
          "Statut Financier",
        ];

        const thead = headers.map((h) => `<th>${h}</th>`).join("");
        const tbody = filteredPlayers
          .map((p) => {
            const row = [
              p.receiptNo,
              p.matricule,
              p.fullName,
              p.categorie,
              p.programme,
              p.expectedFeeLabel,
              p.totalPaye,
              p.soldeLabel,
              p.isPaidInFull ? "À jour" : "Solde Restant",
            ];
            return `<tr>${row.map((field) => `<td>${(field || "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
          })
          .join("");

        const htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8" />
            <style>
              table { border-collapse: collapse; width: 100%; }
              td, th { border: 1px solid #dddddd; padding: 6px; text-align: left; }
              th { background-color: #107C41; color: white; font-weight: bold; }
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
        const blob = new Blob([htmlContent], {
          type: "application/vnd.ms-excel;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `etat_de_compte_joueurs_${new Date().toISOString().slice(0, 10)}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  // Génération de la Fiche "État de Compte Joueur" (PDF Complet)
  const handleGeneratePDF = (playerData: any) => {
    if (!playerData) return;

    const doc = new jsPDF();
    const playerFullName = playerData.fullName || "Joueur";
    const receiptNo = playerData.receiptNo || `EC-FCT-0001`;

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
    doc.setFontSize(18);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text("ÉTAT DE COMPTE", 196, 26, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("N° Référence :", 155, 34, { align: "right" });

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
    doc.text("INFORMATIONS DU JOUEUR", 14, 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(playerFullName, 14, 64);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    let yPos = 70;
    if (playerData.matricule) {
      doc.text(`Matricule : ${playerData.matricule}`, 14, yPos);
      yPos += 5;
    }
    doc.text(`Catégorie : ${playerData.categorie || "Non spécifiée"}`, 14, yPos);
    yPos += 5;
    if (playerData.programme) {
      doc.text(`Programme : ${playerData.programme}`, 14, yPos);
      yPos += 5;
    }
    if (playerData.saison) {
      doc.text(`Saison : ${playerData.saison}`, 14, yPos);
    }

    // Section 2: Parent / Responsable
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
    doc.text("PARENT / RESPONSABLE", 120, 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(playerData.parentNomPrenom || "Non renseigné", 120, 64);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text(`Tél : ${playerData.parentTelephone || "-"}`, 120, 70);
    doc.text(`Email : ${playerData.parentEmail || "-"}`, 120, 75);
    if (playerData.parentAdresse) {
      const shortAddress =
        playerData.parentAdresse.length > 40
          ? playerData.parentAdresse.substring(0, 37) + "..."
          : playerData.parentAdresse;
      doc.text(`Adresse : ${shortAddress}`, 120, 80);
    }

    // Section 3: RÉCAPITULATIF FINANCIER & BALANCE (Cadre récapitulatif)
    const boxY = 92;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, boxY, 182, 24, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, boxY, 182, 24, 2, 2, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
    doc.text("COTISATION PRÉVUE", 22, boxY + 7);
    doc.text("TOTAL PAYÉ", 85, boxY + 7);
    doc.text("SOLDE RESTANT (BALANCE)", 142, boxY + 7);

    doc.setFontSize(11);
    doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
    doc.text(playerData.expectedFeeLabel, 22, boxY + 16);
    doc.text(playerData.totalPaye, 85, boxY + 16);

    if (playerData.isPaidInFull) {
      doc.setTextColor(16, 185, 129); // Green
      doc.text("0.00 (À jour)", 142, boxY + 16);
    } else {
      doc.setTextColor(225, 29, 72); // Red / Rose
      doc.text(playerData.soldeLabel, 142, boxY + 16);
    }

    // Section 4: Tableau détaillé des versements
    const tableStartY = 124;
    const tableColumn = ["Date", "Description / Rubrique", "Mode", "Montant Versé"];
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
        "Aucun versement enregistré à ce jour",
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
    doc.text("Total des versements effectués", 100, finalY + 10);
    doc.text(playerData.totalPaye, 196, finalY + 10, { align: "right" });

    doc.setDrawColor(grayLight[0], grayLight[1], grayLight[2]);
    doc.setLineWidth(0.5);
    doc.line(100, finalY + 14, 196, finalY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("SOLDE DE COMPTE", 100, finalY + 21);
    doc.text(playerData.soldeLabel, 196, finalY + 21, { align: "right" });

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
        const logoW = logoH * 5.638;
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

        doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
        doc.text(textPrefix, curX, textY);
        curX += wPrefix + gap;

        if (OCTACORE_LOGO) {
          doc.addImage(OCTACORE_LOGO, "PNG", curX, 284.4, logoW, logoH, undefined, "FAST");
        }
        curX += logoW + gap;

        doc.setTextColor(grayMedium[0], grayMedium[1], grayMedium[2]);
        doc.text(textSeparator, curX, textY);
        curX += wSep + gap;

        doc.setTextColor(59, 130, 246);
        doc.text(textUrl, curX, textY);
        doc.link(startX, 283.5, totalBlockW, 6, { url: "https://octacore.io" });
      }
    } catch (err) {
      console.warn("Could not render Octacore footer on all pages", err);
    }

    doc.save(
      `Etat_De_Compte_${playerFullName.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Styles d'impression CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, sidebar, nav, aside {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 6px 10px !important;
            color: #000 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* En-tête exclusif pour impression papier / PDF */}
      <div className="print-only mb-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo/logo.png" alt="FC Toro" className="h-14 w-auto" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-black">FC TORO — ÉTAT DES TRANSACTIONS</h1>
              <p className="text-xs text-gray-700">Relevé officiel des règlements et encaissements enregistrés</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-700">
            <p><strong>Date d'édition :</strong> {new Date().toLocaleDateString("fr-FR")}</p>
            <p><strong>Période :</strong> {txDateFrom || "Historique global"} au {txDateTo || "Aujourd'hui"}</p>
            <p><strong>Total transactions :</strong> {txTotals.validCount} validée(s)</p>
          </div>
        </div>
        <div className="mt-4 flex gap-8 text-xs font-bold bg-gray-100 p-3 rounded">
          <span>Total USD : <strong className="text-black">{formatClubCurrency(txTotals.totalUSD, "US")}</strong></span>
          <span>Total Gourdes : <strong className="text-black">{formatClubCurrency(txTotals.totalHTG, "HTG")}</strong></span>
        </div>
      </div>

      <div className="no-print">
        <PageBreadcrumb pageTitle="État de Compte & Transactions" />
      </div>

      {/* Onglets Principaux de Navigation */}
      <div className="flex flex-wrap items-center border-b border-gray-200 dark:border-gray-800 gap-1 no-print">
        <button
          onClick={() => {
            setActiveTab("all");
            setCurrentPage(1);
          }}
          className={`pb-3 pt-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "all"
              ? "border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Tous les joueurs actifs ({uniquePlayersData.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("paid");
            setCurrentPage(1);
          }}
          className={`pb-3 pt-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "paid"
              ? "border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          À jour / Régler ({uniquePlayersData.filter((p) => p.isPaidInFull).length})
        </button>
        <button
          onClick={() => {
            setActiveTab("unpaid");
            setCurrentPage(1);
          }}
          className={`pb-3 pt-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "unpaid"
              ? "border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Solde Restant ({uniquePlayersData.filter((p) => !p.isPaidInFull).length})
        </button>
        <button
          onClick={() => {
            setActiveTab("transactions");
            setTxCurrentPage(1);
          }}
          className={`pb-3 pt-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "transactions"
              ? "border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          <span>Toutes les transactions</span>
          <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs px-2 py-0.5 font-bold">
            {payments.length}
          </span>
        </button>
      </div>

      {activeTab === "transactions" ? (
        /* VUE ONGLET : TOUTES LES TRANSACTIONS SYSTÈME */
        <div className="space-y-6">
          {/* Barre d'outils et Filtres Transactions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 no-print space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="grid flex-1 gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
                {/* Recherche */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Recherche
                  </label>
                  <input
                    type="text"
                    value={txSearchQuery}
                    onChange={(e) => {
                      setTxSearchQuery(e.target.value);
                      setTxCurrentPage(1);
                    }}
                    placeholder="N° reçu, joueur, matricule..."
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Date Du */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Date Du
                  </label>
                  <input
                    type="date"
                    value={txDateFrom}
                    onChange={(e) => {
                      setTxDateFrom(e.target.value);
                      setTxCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Date Au */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Date Au
                  </label>
                  <input
                    type="date"
                    value={txDateTo}
                    onChange={(e) => {
                      setTxDateTo(e.target.value);
                      setTxCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Devise */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Devise
                  </label>
                  <select
                    value={txDevise}
                    onChange={(e) => {
                      setTxDevise(e.target.value as any);
                      setTxCurrentPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Toutes les devises</option>
                    <option value="US">USD ($ - Dollars)</option>
                    <option value="HTG">HTG (Gourdes)</option>
                  </select>
                </div>
              </div>

              {/* Boutons d'Action (Imprimer, PDF, Export) */}
              <div className="flex flex-wrap items-end gap-2 shrink-0 pt-2 lg:pt-0">
                <button
                  onClick={handlePrintTransactions}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gray-100 px-3.5 text-xs font-bold text-gray-800 shadow-theme-xs hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Imprimer le relevé des transactions filtrées"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>Imprimer</span>
                </button>

                <button
                  onClick={handleExportTransactionsPDF}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-3.5 text-xs font-bold text-white shadow-theme-xs hover:bg-brand-600 transition-colors cursor-pointer"
                  title="Exporter les transactions filtrées au format PDF officiel"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF Relevé</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-3.5 text-xs font-bold text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
                  >
                    <DownloadIcon className="size-4" />
                    <span>Excel / CSV</span>
                  </button>
                  <Dropdown
                    isOpen={isExportOpen}
                    onClose={() => setIsExportOpen(false)}
                    className="w-36"
                  >
                    <DropdownItem onItemClick={handleExportExcel}>
                      Excel (.xls)
                    </DropdownItem>
                    <DropdownItem onItemClick={handleExportCSV}>
                      CSV (.csv)
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>
            </div>

            {/* Raccourcis de dates rapides */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
              <span className="font-bold text-gray-500 dark:text-gray-400">Période rapide :</span>
              <button
                onClick={() => setQuickTxDate("today")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${txDateFrom === new Date().toISOString().slice(0, 10) && txDateTo === new Date().toISOString().slice(0, 10) ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setQuickTxDate("week")}
                className="px-2.5 py-1 rounded-md font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all"
              >
                Cette semaine
              </button>
              <button
                onClick={() => setQuickTxDate("month")}
                className="px-2.5 py-1 rounded-md font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all"
              >
                Ce mois-ci
              </button>
              <button
                onClick={() => setQuickTxDate("year")}
                className="px-2.5 py-1 rounded-md font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all"
              >
                Cette année
              </button>
              <button
                onClick={() => setQuickTxDate("all")}
                className="px-2.5 py-1 rounded-md font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 transition-all"
              >
                Tout réinitialiser
              </button>
            </div>
          </div>

          {/* Synthèse des Transactions Filtrées (KPIs) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Dollars ($)
                  </span>
                  <span className="mt-1 block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatClubCurrency(txTotals.totalUSD, "US")}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Encaissements réels USD
                  </span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                  <DollarLineIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Gourdes (HTG)
                  </span>
                  <span className="mt-1 block text-2xl font-black text-blue-600 dark:text-blue-400">
                    {formatClubCurrency(txTotals.totalHTG, "HTG")}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Encaissements réels HTG
                  </span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600">
                  <DollarLineIcon className="size-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Nombre de Règlements
                  </span>
                  <span className="mt-1 block text-2xl font-black text-gray-900 dark:text-white">
                    {txTotals.validCount} / {txTotals.totalCount}
                  </span>
                  <span className="mt-0.5 block text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Reçus validés sur la période
                  </span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700">
                  <CheckCircleIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Table des Transactions */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="mb-4 flex items-center justify-between no-print">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Journal Chronologique des Transactions
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filteredTransactions.length} transaction(s) trouvée(s)
                </p>
              </div>
            </div>

            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Date
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      N° Reçu
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Joueur
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Parent / Contact
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Mode
                    </TableCell>
                    <TableCell isHeader className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Montant USD ($)
                    </TableCell>
                    <TableCell isHeader className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Montant HTG (HTG)
                    </TableCell>
                    <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Statut
                    </TableCell>
                    <TableCell isHeader className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Remarque / Plan
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pagedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400 italic">
                        Aucune transaction enregistrée pour ces critères.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedTransactions.map((tx) => {
                      const pl = playerMap.get(String(tx.playerId));
                      const pName = pl ? `${pl.prenom} ${pl.nom}` : `Joueur #${tx.playerId}`;
                      const recu = (tx as any).numeroRecu || (tx as any).recuNo || `REC-${tx.id}`;
                      const dt = tx.datePaiement || (tx as any).dateTransact || tx.periode || "-";
                      const u = Number(tx.montantUS) || 0;
                      const h = Number(tx.montantHTG) || 0;

                      return (
                        <TableRow key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {dt}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                            {recu}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-900 dark:text-white font-semibold">
                            <div className="flex flex-col">
                              <span>{pName}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {pl?.categorie || "Sans catégorie"}
                                {pl?.matricule ? ` · #${pl.matricule}` : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {pl?.parentNomPrenom || "Non renseigné"}
                              </span>
                              <span>{pl?.parentTelephone || ""}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm capitalize text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {tx.methode || "Standard"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono">
                            {u > 0 ? formatClubCurrency(u, "US") : "-"}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap font-mono">
                            {h > 0 ? formatClubCurrency(h, "HTG") : "-"}
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-center whitespace-nowrap">
                            <Badge
                              variant="light"
                              color={tx.statut === "paid" ? "success" : "warning"}
                              size="sm"
                            >
                              {tx.statut === "paid" ? "Validé" : (tx.statut || "En attente")}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                            {tx.remarque || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {/* Ligne de Totalisation comptable */}
                <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 font-bold text-xs">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      TOTAL DE LA SÉLECTION :
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatClubCurrency(txTotals.totalUSD, "US")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {formatClubCurrency(txTotals.totalHTG, "HTG")}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-xs text-gray-500">
                      {txTotals.validCount} règlement(s) validé(s)
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </div>

            {/* Pagination des transactions */}
            <div className="mt-4 flex justify-end no-print">
              <Pagination
                currentPage={txCurrentPageSafe}
                totalPages={txTotalPages}
                onPageChange={setTxCurrentPage}
                pageSize={txCurrentPageSize}
                onPageSizeChange={(size) => {
                  setTxCurrentPageSize(size);
                  setTxCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* VUE ÉTAT DE COMPTE JOUEURS */
        <div className="space-y-6">
          {/* Barre d'outils et Filtres Joueurs */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between no-print">
            <div className="grid flex-1 gap-2 grid-cols-1 sm:grid-cols-3 min-w-0">
              <div className="min-w-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Rechercher un joueur (Nom, matricule, parent)..."
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div className="min-w-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
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
                  onChange={(e) => {
                    setSelectedSeason(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full min-w-0 max-w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="all">Toutes les saisons</option>
                  {seasons.map((season) => (
                    <option key={season} value={season}>
                      {String(season).toLowerCase().startsWith("saison") ? season : `Saison ${season}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bouton Exporter Excel / CSV */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors cursor-pointer"
              >
                <DownloadIcon className="size-4" />
                Exporter Excel / CSV
              </button>
              <Dropdown
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                className="w-36"
              >
                <DropdownItem onItemClick={handleExportExcel}>
                  Excel (.xls)
                </DropdownItem>
                <DropdownItem onItemClick={handleExportCSV}>
                  CSV (.csv)
                </DropdownItem>
              </Dropdown>
            </div>
          </div>

          {/* Carte Principale du Tableau Joueurs */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Liste des États de Compte (Joueurs Actifs)
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filteredPlayers.length} joueur(s) actif(s) affiché(s)
                </p>
              </div>
            </div>

            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      N° Réf.
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
                      className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      Cotisation Prévue
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      Total Payé
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      Solde Restant
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      Statut
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
                  {!hydrated && activePlayers.length === 0 ? (
                    <TableBodySkeleton rows={10} columns={8} />
                  ) : pagedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun joueur actif trouvé pour ces critères.
                      </TableCell>
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
                        <TableCell className="py-3 text-theme-sm text-right font-medium text-gray-700 dark:text-gray-300">
                          {playerData.expectedFeeLabel}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {playerData.totalPaye}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-right font-bold">
                          {playerData.isPaidInFull ? (
                            <span className="text-emerald-600 dark:text-emerald-400">0.00</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">{playerData.soldeLabel}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-center">
                          <Badge
                            variant="light"
                            color={playerData.isPaidInFull ? "success" : "warning"}
                            size="sm"
                          >
                            {playerData.isPaidInFull ? "À jour" : "Solde Restant"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-center">
                          <button
                            onClick={() => handleGeneratePDF(playerData)}
                            className="inline-flex items-center justify-center text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition cursor-pointer p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            aria-label="Télécharger la fiche État de compte (PDF)"
                            title="Télécharger la fiche État de compte (PDF)"
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

            {/* Pagination à la fin du tableau Joueurs */}
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
      )}
      <ConfirmComponent />
    </div>
  );
}
