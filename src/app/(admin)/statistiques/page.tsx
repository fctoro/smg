"use client";

import React, { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import CombinedRevenueChart from "@/components/club/charts/CombinedRevenueChart";
import RegistrationsChart from "@/components/club/charts/RegistrationsChart";
import { formatClubCurrency } from "@/lib/club/metrics";
import {
  getYearlyRevenue,
  getYearlyRegistrations,
  getMonthlyRevenue,
  getMonthlyRegistrations,
  getWeeklyRevenue,
  getWeeklyRegistrations,
  getDailyRevenue,
  getAvailableYears,
  combineYearlyData,
} from "@/lib/club/statistics";
import {
  GroupIcon,
  DollarLineIcon,
  CheckCircleIcon,
  DownloadIcon,
} from "@/icons";

const TRACKING_KEY = "club-tracking-active-time-v1";
type TrackingPeriod = "day" | "week" | "month" | "year";
type TrackingTimeByDay = Record<string, number>;

const getTrackingDateKey = (date: Date) => date.toISOString().slice(0, 10);
const getTrackingPeriodStart = (date: Date, period: TrackingPeriod) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }
  return start;
};

const formatTrackingDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
};

export default function StatistiquesPage() {
  const { players, payments } = useClubData();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [periodType, setPeriodType] = useState<'daily' | 'yearly' | 'monthly' | 'weekly'>("yearly");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [trackingPeriod, setTrackingPeriod] = useState<TrackingPeriod>("day");
  const [trackingReferenceDate, setTrackingReferenceDate] = useState(() => new Date());
  const [trackingActiveSeconds, setTrackingActiveSeconds] = useState(0);
  const [trackingTimeByDay, setTrackingTimeByDay] = useState<TrackingTimeByDay>({});

  const now = new Date();
  const currentYearActual = now.getFullYear();
  const isAllTime = selectedYear === "all";
  const displayYear = isAllTime ? currentYearActual : parseInt(selectedYear || String(currentYearActual), 10);

  const isUSDDevise = (devise?: string): boolean => {
    const d = String(devise || "").toUpperCase();
    return d === "US" || d === "USD" || d === "$";
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(TRACKING_KEY) || "{}");
      setTrackingTimeByDay(stored.timeByDay || {});
    } catch {
      setTrackingTimeByDay({});
    }

    let lastRecordedAt = Date.now();
    const recordTime = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - lastRecordedAt) / 1000));
      if (!elapsed) return;
      const key = getTrackingDateKey(new Date(lastRecordedAt));
      setTrackingTimeByDay((current) => {
        const next = { ...current, [key]: (current[key] || 0) + elapsed };
        localStorage.setItem(TRACKING_KEY, JSON.stringify({ timeByDay: next }));
        return next;
      });
      setTrackingActiveSeconds((current) => current + elapsed);
      lastRecordedAt = now;
    };

    const interval = window.setInterval(recordTime, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") recordTime();
      else {
        lastRecordedAt = Date.now();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", recordTime);

    return () => {
      recordTime();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", recordTime);
    };
  }, []);

  // Extraction YYYY-MM-DD sans décalage horaire
  const getDateDayString = (dateInput?: any): string => {
    if (!dateInput) return "";
    const str = String(dateInput).trim();
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return "";
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isDateInRange = (dateInput: any, fromStr?: string, toStr?: string): boolean => {
    if (!fromStr && !toStr) return true;
    const dayStr = getDateDayString(dateInput);
    if (!dayStr) return false;
    if (fromStr && dayStr < fromStr) return false;
    if (toStr && dayStr > toStr) return false;
    return true;
  };

  // Boutons de raccourcis rapides
  const setQuickDateRange = (type: 'today' | 'month' | 'year' | 'all') => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    if (type === 'today') {
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setDateFrom(todayStr);
      setDateTo(todayStr);
      setPeriodType('daily');
      setTrackingPeriod('day');
      setTrackingReferenceDate(today);
    } else if (type === 'month') {
      setDateFrom(`${yyyy}-${mm}-01`);
      setDateTo(`${yyyy}-${mm}-${dd}`);
      setPeriodType('monthly');
      setTrackingPeriod('month');
    } else if (type === 'year') {
      setDateFrom(`${yyyy}-01-01`);
      setDateTo(`${yyyy}-12-31`);
      setPeriodType('yearly');
      setTrackingPeriod('year');
    } else if (type === 'all') {
      setDateFrom("");
      setDateTo("");
      setPeriodType('yearly');
      setTrackingPeriod('year');
    }
  };

  // Filtrage strict : uniquement les paiements filtrés
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.statut !== statusFilter) return false;
      const dateStr = p.datePaiement || p.periode || (p as any).createdAt || null;
      return isDateInRange(dateStr, dateFrom, dateTo);
    });
  }, [payments, dateFrom, dateTo, statusFilter]);

  // FILTRAGE STRICT DES JOUEURS : UNIQUEMENT LES JOUEURS ACTIFS !
  const activePlayersList = useMemo(() => {
    return players.filter((pl) => pl.statut === "actif");
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return activePlayersList.filter((pl) => {
      const dateStr = pl.dateInscription || (pl as any).createdAt || (pl as any).dtInscription || null;
      return isDateInRange(dateStr, dateFrom, dateTo);
    });
  }, [activePlayersList, dateFrom, dateTo]);

  // Agrégations
  const availableYears = useMemo(() => getAvailableYears(filteredPlayers, filteredPayments), [filteredPlayers, filteredPayments]);

  const totalRevenueHTG = useMemo(
    () => filteredPayments
      .filter((p) => p.statut === "paid" && p.devise === "HTG")
      .reduce((sum, p) => sum + (p.montantHTG || p.montant || 0), 0),
    [filteredPayments]
  );

  const totalRevenueUSD = useMemo(
    () => filteredPayments
      .filter((p) => p.statut === "paid" && isUSDDevise(p.devise))
      .reduce((sum, p) => sum + (p.montantUS || p.montant || 0), 0),
    [filteredPayments]
  );

  const totalActivePlayersCount = filteredPlayers.length;

  const totalPaidPlayersCount = useMemo(() => {
    const paidIds = new Set(filteredPayments.filter(p => p.statut === "paid").map(p => String(p.playerId)));
    return filteredPlayers.filter(p => paidIds.has(String(p.id))).length;
  }, [filteredPlayers, filteredPayments]);

  const totalPaymentsCount = filteredPayments.filter(p => p.statut === "paid").length;

  const trackingPeriodPayments = useMemo(() => {
    const startDayStr = getDateDayString(getTrackingPeriodStart(trackingReferenceDate, trackingPeriod));
    const endDayStr = getDateDayString(trackingReferenceDate);

    return payments.filter((payment) => {
      if (payment.statut !== "paid") return false;
      const dateStr = payment.datePaiement || (payment as any).dateTransact || (payment as any).dtCreation || `${payment.periode}-01`;
      return isDateInRange(dateStr, startDayStr, endDayStr);
    });
  }, [payments, trackingPeriod, trackingReferenceDate]);

  const trackingPeriodTime = useMemo(() => {
    const start = getTrackingPeriodStart(trackingReferenceDate, trackingPeriod);
    return Object.entries(trackingTimeByDay).reduce((total, [key, seconds]) => {
      const date = new Date(`${key}T12:00:00`);
      return date >= start && date <= trackingReferenceDate ? total + seconds : total;
    }, 0) + (trackingPeriod === "day" ? trackingActiveSeconds : 0);
  }, [trackingTimeByDay, trackingActiveSeconds, trackingPeriod, trackingReferenceDate]);

  const trackingTotalUSD = trackingPeriodPayments
    .filter((payment) => isUSDDevise(payment.devise))
    .reduce((total, payment) => total + (payment.montantUS || payment.montant || 0), 0);
  const trackingTotalHTG = trackingPeriodPayments
    .filter((payment) => payment.devise === "HTG")
    .reduce((total, payment) => total + (payment.montantHTG || payment.montant || 0), 0);

  const trackingPeriodLabels: Record<TrackingPeriod, string> = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
  };

  const playerStatusStats = useMemo(() => {
    const statusLabels = ["Boursier", "Demi-bourse", "Joueur spécial"];
    const stats: Record<string, number> = Object.fromEntries(
      statusLabels.map((status) => [status, 0]),
    );
    filteredPlayers.forEach((player) => {
      const status = player.statutJoueur?.trim();
      const matchingStatus = statusLabels.find(
        (label) => label.toLowerCase() === status?.toLowerCase(),
      );
      if (matchingStatus) stats[matchingStatus] += 1;
    });
    
    return stats;
  }, [filteredPlayers]);

  const yearsList = availableYears.length > 0 ? availableYears : Array.from({ length: currentYearActual - 2012 + 1 }, (_, i) => currentYearActual - i);

  // EXPORTATION EXCEL EXPLOITABLE
  const exportPaymentsCSV = (rows: typeof payments) => {
    if (!rows || rows.length === 0) return;
    const playerMap = new Map(players.map(p => [p.id, p]));

    let csvContent = "\uFEFF";
    csvContent += "Date,Numero_Recu,Joueur,Matricule,Programme,Categorie,Mode_Paiement,Devise,Montant_USD,Montant_HTG,Statut\n";

    rows.forEach(p => {
      const pl = playerMap.get(String(p.playerId));
      const pName = pl ? `"${(pl.prenom + ' ' + pl.nom).replace(/"/g, '""')}"` : `"Joueur #${p.playerId}"`;
      const mat = pl?.matricule ? `"${pl.matricule.replace(/"/g, '""')}"` : '""';
      const prog = pl?.programme ? `"${pl.programme.replace(/"/g, '""')}"` : '"FC Toro"';
      const cat = pl?.categorie ? `"${pl.categorie.replace(/"/g, '""')}"` : '""';
      const dt = p.datePaiement || p.periode || "";
      const recu = p.numeroRecu || `REC-${p.id}`;
      const mode = p.methode || "especes";
      
      const mntUS = isUSDDevise(p.devise) ? Number(p.montantUS || p.montant || 0).toFixed(2) : "0.00";
      const mntHTG = p.devise === "HTG" ? Number(p.montantHTG || p.montant || 0).toFixed(2) : "0.00";
      const statut = p.statut || "paid";

      csvContent += `${dt},${recu},${pName},${mat},${prog},${cat},${mode},${p.devise || 'US'},${mntUS},${mntHTG},${statut}\n`;
    });

    // Lignes de synthèse totales au bas du fichier CSV pour Excel (avec devises explicites)
    const totalUSDExport = rows.filter(p => isUSDDevise(p.devise) && p.statut === "paid").reduce((sum, p) => sum + (p.montantUS || p.montant || 0), 0);
    const totalHTGExport = rows.filter(p => p.devise === "HTG" && p.statut === "paid").reduce((sum, p) => sum + (p.montantHTG || p.montant || 0), 0);

    csvContent += `\nTOTAL,,,,"TOTAL ENCAISSEMENTS",,,${totalUSDExport.toFixed(2)} USD,${totalHTGExport.toFixed(2)} HTG,VALIDES\n`;
    csvContent += `JOUEURS_ACTIFS,,,,"EFFECTIF JOUEURS ACTIFS",,,${totalActivePlayersCount} Joueurs,,ACTIFS\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_fctoro_${dateFrom || 'debut'}_au_${dateTo || 'aujourdhui'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const yearlyData = useMemo(() => {
    const revenue = getYearlyRevenue(filteredPayments);
    const registrations = getYearlyRegistrations(filteredPlayers);
    return combineYearlyData(revenue, registrations);
  }, [filteredPayments, filteredPlayers]);

  const monthlyRevenueData = useMemo(() => getMonthlyRevenue(filteredPayments, displayYear), [filteredPayments, displayYear]);
  const monthlyRegistrationsData = useMemo(() => getMonthlyRegistrations(filteredPlayers, displayYear), [filteredPlayers, displayYear]);

  const weeklyRevenueData = useMemo(() => getWeeklyRevenue(filteredPayments, displayYear), [filteredPayments, displayYear]);
  const weeklyRegistrationsData = useMemo(() => getWeeklyRegistrations(filteredPlayers, displayYear), [filteredPlayers, displayYear]);
  const dailyRevenueData = useMemo(() => getDailyRevenue(filteredPayments, dateFrom || new Date().toISOString().slice(0, 10)), [filteredPayments, dateFrom]);

  return (
    <div className="space-y-6 pb-12 print:p-0 print:bg-white text-gray-900 dark:text-white">
      {/* Printable CSS Header */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, sidebar, nav {
            display: none !important;
          }
          .print-header {
            display: block !important;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px 12px !important;
            color: #000 !important;
          }
        }
      `}</style>

      {/* Header Standard & Professionnel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb pageTitle="Statistiques" />
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Toutes les saisons</option>
            {yearsList.map((y) => (
              <option key={y} value={y.toString()}>
                Saison {y}-{y + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toolbar & Filter Options */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 px-2">Du :</span>
              <input 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                type="date" 
                className="rounded-lg border-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white shadow-xs focus:ring-2 focus:ring-brand-500" 
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 px-2">Au :</span>
              <input 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                type="date" 
                className="rounded-lg border-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white shadow-xs focus:ring-2 focus:ring-brand-500" 
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 px-2">Règlement :</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="rounded-lg border-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white shadow-xs"
              >
                <option value="all">Tous les règlements</option>
                <option value="paid">Payé (Validé)</option>
                <option value="pending">En attente</option>
                <option value="late">En retard</option>
              </select>
            </div>
          </div>

          {/* Quick Date Shortcuts & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 mr-1">Sélection rapide :</span>
            <button 
              onClick={() => setQuickDateRange('today')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                dateFrom === new Date().toISOString().slice(0,10) && dateTo === new Date().toISOString().slice(0,10)
                  ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Aujourd'hui
            </button>
            <button 
              onClick={() => setQuickDateRange('month')}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Ce mois-ci
            </button>
            <button 
              onClick={() => setQuickDateRange('year')}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Cette année
            </button>
            <button 
              onClick={() => setQuickDateRange('all')}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-all"
            >
              Réinitialiser
            </button>

            <button 
              onClick={() => exportPaymentsCSV(filteredPayments)} 
              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#107C41] px-4 text-xs font-medium text-white shadow-theme-xs hover:bg-[#0c5e31] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <path d="M14 2v6h6"></path>
                <path d="M8 13h2"></path>
                <path d="M14 13h2"></path>
                <path d="M8 17h2"></path>
                <path d="M14 17h2"></path>
              </svg>
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — Design Exécutif Épuré (Monochrome & Professionnel) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Recettes USD */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recettes USD ($)</span>
              <span className="mt-1 block text-2xl font-black text-gray-900 dark:text-white">
                {formatClubCurrency(totalRevenueUSD, "US")}
              </span>
              <span className="mt-0.5 block text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {totalPaymentsCount} versement(s) en USD validé(s)
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <DollarLineIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Recettes HTG */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recettes HTG (Gourdes)</span>
              <span className="mt-1 block text-2xl font-black text-gray-900 dark:text-white">
                {formatClubCurrency(totalRevenueHTG, "HTG")}
              </span>
              <span className="mt-0.5 block text-xs text-blue-600 dark:text-blue-400 font-semibold">
                Paiements enregistrés en Gourdes
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <DollarLineIcon className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Joueurs Actifs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Joueurs Actifs</span>
              <span className="mt-1 block text-2xl font-black text-gray-900 dark:text-white">
                {totalActivePlayersCount}
              </span>
              <span className="mt-0.5 block text-xs text-brand-600 dark:text-brand-400 font-semibold">
                Saison en cours 2026-2027
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
        </div>

        {/* Bilan des Paiements */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cotisations Réglées</span>
              <span className="mt-1 block text-2xl font-black text-gray-900 dark:text-white">
                {totalPaidPlayersCount} / {totalActivePlayersCount}
              </span>
              <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400 font-semibold">
                Joueurs à jour sur la période
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <CheckCircleIcon className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques Principaux avec Mode Aujourd'hui */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Évolution des Encaissements</h3>
                <p className="text-xs text-gray-500">Recettes réelles cumulées en USD et HTG</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => setPeriodType('daily')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'daily' ? 'bg-brand-500 text-white shadow-theme-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setPeriodType('weekly')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'weekly' ? 'bg-brand-500 text-white shadow-theme-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  Hebdomadaire
                </button>
                <button
                  onClick={() => setPeriodType('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'monthly' ? 'bg-brand-500 text-white shadow-theme-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setPeriodType('yearly')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'yearly' ? 'bg-brand-500 text-white shadow-theme-xs' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  Annuel
                </button>
              </div>
            </div>
            <CombinedRevenueChart
              data={
                periodType === 'daily' ? dailyRevenueData :
                periodType === 'monthly' ? monthlyRevenueData :
                periodType === 'weekly' ? weeklyRevenueData :
                yearlyData
              }
              type={periodType}
              title={
                periodType === 'daily' ? `Revenus du jour — Aujourd'hui` :
                periodType === 'monthly' ? `Revenus mensuels — ${displayYear}` :
                periodType === 'weekly' ? `Revenus hebdomadaires — ${displayYear}` :
                'Revenus annuels'
              }
            />
          </div>
        </div>

        {/* Statuts Spéciaux & Répartition */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
              Répartition des Bourses & Exonérations
            </h4>
            <div className="space-y-3">
              {Object.entries(playerStatusStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{status}</span>
                  <span className="text-sm font-extrabold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    {count} joueur(s)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Bilan Synthétique
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Joueurs Actifs (Total)</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalActivePlayersCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Reçus financiers émis</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalPaymentsCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Total USD encaissé</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatClubCurrency(totalRevenueUSD, "US")}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Total HTG encaissé</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatClubCurrency(totalRevenueHTG, "HTG")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journal des Encaissements par Période */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Journal des Encaissements & Reçus Émis</h3>
            <p className="text-xs text-gray-500">Historique chronologique des règlements pour la période sélectionnée</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tracking-date" className="text-xs font-bold text-gray-500">Date :</label>
            <input
              id="tracking-date"
              type="date"
              value={getTrackingDateKey(trackingReferenceDate)}
              onChange={(event) => setTrackingReferenceDate(new Date(`${event.target.value}T23:59:59`))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {(Object.keys(trackingPeriodLabels) as TrackingPeriod[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTrackingPeriod(value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${trackingPeriod === value ? "bg-brand-500 text-white shadow-theme-xs" : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"}`}
            >
              {trackingPeriodLabels[value]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TrackingMetric label="Reçus validés" value={String(trackingPeriodPayments.length)} detail="Reçus émis sur la période" />
          <TrackingMetric label="Revenus Dollars ($)" value={formatClubCurrency(trackingTotalUSD, "US")} detail="Entrées nettes en USD" />
          <TrackingMetric label="Revenus Gourdes (G)" value={formatClubCurrency(trackingTotalHTG, "HTG")} detail="Entrées nettes en HTG" />
          <TrackingMetric label="Durée de session" value={formatTrackingDuration(trackingPeriodTime)} detail="Temps actif enregistré" />
        </div>

        {/* Table de détail des transactions de la période avec TOTAL COMPTABLE */}
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Détail des règlements — {trackingPeriodLabels[trackingPeriod]}
            </h4>
            <span className="text-xs text-gray-500 font-medium">
              {trackingPeriodPayments.length} règlement(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-100/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-bold uppercase border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">N° Reçu</th>
                  <th className="px-4 py-3">Mode de paiement</th>
                  <th className="px-4 py-3">Montant USD ($)</th>
                  <th className="px-4 py-3">Montant HTG (G)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {trackingPeriodPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                      Aucun versement enregistré pour cette période.
                    </td>
                  </tr>
                ) : (
                  trackingPeriodPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{payment.datePaiement || payment.periode}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{payment.numeroRecu || `REC-${payment.id}`}</td>
                      <td className="px-4 py-3 capitalize">{payment.methode || "Standard"}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {isUSDDevise(payment.devise) ? formatClubCurrency(payment.montantUS || payment.montant, "US") : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                        {payment.devise === "HTG" ? formatClubCurrency(payment.montantHTG || payment.montant, "HTG") : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Ligne de Totalisation en bas de la table (Bordereau comptable) */}
              <tfoot className="bg-gray-100/90 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs uppercase border-t-2 border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-black tracking-wider text-gray-700 dark:text-gray-300">TOTAL DE LA PÉRIODE :</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold text-sm">{formatClubCurrency(trackingTotalUSD, "US")}</td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-mono font-extrabold text-sm">{formatClubCurrency(trackingTotalHTG, "HTG")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500 font-medium">{detail}</p>
    </div>
  );
}
