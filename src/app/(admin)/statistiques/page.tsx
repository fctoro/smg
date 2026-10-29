"use client";

import React, { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";
import CombinedRevenueChart from "@/components/club/charts/CombinedRevenueChart";
import RegistrationsChart from "@/components/club/charts/RegistrationsChart";
import { formatClubCurrency, formatClubNumber } from "@/lib/club/metrics";
import KpiCardClub from "@/components/club/KpiCardClub";
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
  getPaymentRealAmounts,
  isUSDDevise,
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

  // Filtrage strict : uniquement les paiements filtrés (avec prise en compte de la saison)
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.statut !== statusFilter) return false;
      const dateStr = p.datePaiement || p.periode || (p as any).createdAt || null;
      if (!isDateInRange(dateStr, dateFrom, dateTo)) return false;

      if (selectedYear !== "all") {
        const pYear = dateStr ? String(dateStr).slice(0, 4) : "";
        const periYear = p.periode ? String(p.periode).slice(0, 4) : "";
        if (pYear !== selectedYear && periYear !== selectedYear) {
          return false;
        }
      }
      return true;
    });
  }, [payments, dateFrom, dateTo, statusFilter, selectedYear]);

  // FILTRAGE STRICT DES JOUEURS : UNIQUEMENT LES JOUEURS ACTIFS DE LA SAISON !
  const activePlayersList = useMemo(() => {
    return players.filter((pl) => pl.statut === "actif");
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return activePlayersList.filter((pl) => {
      const dateStr = pl.dateInscription || (pl as any).createdAt || (pl as any).dtInscription || null;
      if (!isDateInRange(dateStr, dateFrom, dateTo)) return false;

      if (selectedYear !== "all") {
        const s = pl.saison ? String(pl.saison).replace(/^saison\s*/i, "").trim() : "";
        const matchSeason = s.includes(selectedYear) || (pl.saisons && pl.saisons.some(x => String(x).includes(selectedYear)));
        const matchDate = dateStr && String(dateStr).startsWith(selectedYear);
        if (!matchSeason && !matchDate) return false;
      }
      return true;
    });
  }, [activePlayersList, dateFrom, dateTo, selectedYear]);

  // Agrégations
  const availableYears = useMemo(() => getAvailableYears(filteredPlayers, filteredPayments), [filteredPlayers, filteredPayments]);

  // Agrégations financières fiables et strictement identiques au Dashboard
  const financialMetrics = useMemo(() => {
    let usd = 0;
    let htg = 0;
    let countUSD = 0;
    let countHTG = 0;
    let totalValidCount = 0;

    filteredPayments.forEach((p) => {
      if (p.statut !== "paid") return;
      totalValidCount++;
      const u = Number(p.montantUS) || 0;
      const h = Number(p.montantHTG) || 0;
      usd += u;
      htg += h;

      if (u > 0) countUSD++;
      if (h > 0) countHTG++;
    });

    const consolidated = usd + (htg / 135);

    return {
      totalRevenueUSD: Math.round(usd * 100) / 100,
      totalRevenueHTG: Math.round(htg * 100) / 100,
      consolidatedTotalUSD: Math.round(consolidated * 100) / 100,
      countUSD,
      countHTG,
      totalValidCount,
    };
  }, [filteredPayments]);

  const { totalRevenueUSD, totalRevenueHTG, consolidatedTotalUSD, countUSD, countHTG, totalValidCount: totalPaymentsCount } = financialMetrics;

  const totalActivePlayersCount = filteredPlayers.length;

  const totalPaidPlayersCount = useMemo(() => {
    const paidIds = new Set(filteredPayments.filter(p => p.statut === "paid").map(p => String(p.playerId)));
    return filteredPlayers.filter(p => paidIds.has(String(p.id))).length;
  }, [filteredPlayers, filteredPayments]);

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

  const trackingFinancials = useMemo(() => {
    let usd = 0;
    let htg = 0;

    trackingPeriodPayments.forEach((p) => {
      const u = Number(p.montantUS) || 0;
      const h = Number(p.montantHTG) || 0;
      usd += u;
      htg += h;
    });

    const consolidated = usd + (htg / 135);

    return {
      trackingTotalUSD: Math.round(usd * 100) / 100,
      trackingTotalHTG: Math.round(htg * 100) / 100,
      trackingTotalConsolidated: Math.round(consolidated * 100) / 100,
    };
  }, [trackingPeriodPayments]);

  const { trackingTotalUSD, trackingTotalHTG, trackingTotalConsolidated } = trackingFinancials;

  const trackingPeriodLabels: Record<TrackingPeriod, string> = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
  };

  const playerStatusStats = useMemo(() => {
    const counts: Record<string, number> = {
      "Boursier (100%)": 0,
      "Demi-bourse (2500 HTG)": 0,
      "Joueur spécial": 0,
      "Plein tarif (Standard)": 0,
    };

    filteredPlayers.forEach((player) => {
      const raw = (player.statutJoueur || "").toLowerCase().trim();
      if (raw.includes("demi")) {
        counts["Demi-bourse (2500 HTG)"] += 1;
      } else if (raw.includes("bourse") || raw.includes("boursier")) {
        counts["Boursier (100%)"] += 1;
      } else if (raw.includes("spec") || raw.includes("spéc")) {
        counts["Joueur spécial"] += 1;
      } else {
        counts["Plein tarif (Standard)"] += 1;
      }
    });

    return counts;
  }, [filteredPlayers]);

  const yearsList = availableYears.length > 0 ? availableYears : Array.from({ length: currentYearActual - 2012 + 1 }, (_, i) => currentYearActual - i);

  // EXPORTATION EXCEL EXPLOITABLE AVEC VENTILATION RÉELLE ET CONSOLIDATION
  const exportPaymentsCSV = (rows: typeof payments) => {
    if (!rows || rows.length === 0) return;
    const playerMap = new Map(players.map(p => [p.id, p]));

    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Déterminer la période exacte d'extraction
    let startStr = dateFrom;
    let endStr = dateTo || todayStr;

    if (!startStr && rows.length > 0) {
      const dates = rows.map(p => p.datePaiement || p.periode || "").filter(Boolean).sort();
      if (dates.length > 0) startStr = dates[0];
    }
    if (!startStr) startStr = todayStr;

    const periodFileName = startStr === endStr 
      ? startStr 
      : `${startStr}_au_${endStr}`;

    let csvContent = "\uFEFF";
    csvContent += `Période d'extraction : du ${startStr} au ${endStr}\n`;
    csvContent += "Date,Numero_Recu,Joueur,Matricule,Programme,Categorie,Mode_Paiement,Devise,Montant_USD,Montant_HTG,Statut\n";

    rows.forEach(p => {
      const pl = playerMap.get(String(p.playerId));
      const pName = pl ? `"${(pl.prenom + ' ' + pl.nom).replace(/"/g, '""')}"` : `"Joueur #${p.playerId}"`;
      const mat = pl?.matricule ? `"${pl.matricule.replace(/"/g, '""')}"` : '""';
      const prog = pl?.programme ? `"${pl.programme.replace(/"/g, '""')}"` : '"FC Toro"';
      const cat = pl?.categorie ? `"${pl.categorie.replace(/"/g, '""')}"` : '""';
      const dt = p.datePaiement || p.periode || "";
      const recu = (p as any).numeroRecu || (p as any).recuNo || `REC-${p.id}`;
      const mode = p.methode || "especes";
      
      const u = Number(p.montantUS) || 0;
      const h = Number(p.montantHTG) || 0;
      const mntUS = u > 0 ? u.toFixed(2) : "0.00";
      const mntHTG = h > 0 ? h.toFixed(2) : "0.00";
      const statut = p.statut || "paid";

      csvContent += `${dt},${recu},${pName},${mat},${prog},${cat},${mode},${p.devise || 'US'},${mntUS},${mntHTG},${statut}\n`;
    });

    // Lignes de synthèse totales au bas du fichier CSV pour Excel (avec devises explicites)
    let totalUSDExport = 0;
    let totalHTGExport = 0;

    rows.filter(p => p.statut === "paid").forEach(p => {
      totalUSDExport += Number(p.montantUS) || 0;
      totalHTGExport += Number(p.montantHTG) || 0;
    });
    const totalConsolidatedExport = totalUSDExport + (totalHTGExport / 135);

    csvContent += `\nTOTAL,,,,"TOTAL ENCAISSEMENTS RÉELS",,,${totalUSDExport.toFixed(2)} USD,${totalHTGExport.toFixed(2)} HTG,VALIDES\n`;
    csvContent += `CONSOLIDÉ,,,,"TOTAL CONSOLIDÉ ÉQUIV. USD (TAUX 135)",,,${totalConsolidatedExport.toFixed(2)} USD,,OFFICIEL\n`;
    csvContent += `JOUEURS_ACTIFS,,,,"EFFECTIF JOUEURS ACTIFS",,,${totalActivePlayersCount} Joueurs,,ACTIFS\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_fctoro_${periodFileName}.csv`;
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
              <DownloadIcon className="size-4" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — Corporate TailAdmin Identique au Dashboard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <KpiCardClub
          title="Joueurs actifs"
          value={formatClubNumber(totalActivePlayersCount)}
          icon={<GroupIcon className="size-6 text-gray-800 dark:text-white/90" />}
        />
        <KpiCardClub
          title={isAllTime ? "Revenus Globaux (USD)" : `Revenus (USD) ${displayYear}`}
          value={formatClubCurrency(totalRevenueUSD, "US")}
          icon={<DollarLineIcon className="size-6 text-emerald-500" />}
        />
        <KpiCardClub
          title={isAllTime ? "Revenus Globaux (HTG)" : `Revenus (HTG) ${displayYear}`}
          value={formatClubCurrency(totalRevenueHTG, "HTG")}
          icon={<DollarLineIcon className="size-6 text-blue-500" />}
        />
        <KpiCardClub
          title="Paiements"
          value={formatClubNumber(filteredPayments.length)}
          trend={{
            value: `${totalActivePlayersCount > 0 ? Math.round((totalPaidPlayersCount / totalActivePlayersCount) * 100) : 0}% à jour`,
            direction: "up",
          }}
          icon={<CheckCircleIcon className="size-6 text-emerald-600 dark:text-emerald-400" />}
        />
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
                <span className="text-gray-500">Total Consolidé (Équiv. USD)</span>
                <span className="font-extrabold text-brand-600 dark:text-brand-400">{formatClubCurrency(consolidatedTotalUSD, "US")}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Total USD encaissé</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatClubCurrency(totalRevenueUSD, "US")}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Total HTG encaissé</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatClubCurrency(totalRevenueHTG, "HTG")}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Joueurs Actifs (Total)</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalActivePlayersCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Taux de recouvrement</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{totalActivePlayersCount > 0 ? Math.round((totalPaidPlayersCount / totalActivePlayersCount) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Reçus financiers émis</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalPaymentsCount}</span>
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
          <TrackingMetric
            label="Total Consolidé"
            value={formatClubCurrency(trackingTotalConsolidated, "US")}
            detail="Revenu unifié (taux 135)"
            icon={<DollarLineIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          />
          <TrackingMetric
            label="Revenus Dollars ($)"
            value={formatClubCurrency(trackingTotalUSD, "US")}
            detail="Entrées réelles en USD"
            icon={<DollarLineIcon className="size-6 text-emerald-500" />}
          />
          <TrackingMetric
            label="Revenus Gourdes (HTG)"
            value={formatClubCurrency(trackingTotalHTG, "HTG")}
            detail="Entrées réelles en HTG"
            icon={<DollarLineIcon className="size-6 text-blue-500" />}
          />
          <TrackingMetric
            label="Reçus validés"
            value={String(trackingPeriodPayments.length)}
            detail="Reçus émis sur la période"
            icon={<CheckCircleIcon className="size-6 text-emerald-600 dark:text-emerald-400" />}
          />
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
                  trackingPeriodPayments.map((payment) => {
                    const u = Number(payment.montantUS) || 0;
                    const h = Number(payment.montantHTG) || 0;
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{payment.datePaiement || payment.periode}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">{(payment as any).numeroRecu || (payment as any).recuNo || `REC-${payment.id}`}</td>
                        <td className="px-4 py-3 capitalize">{payment.methode || "Standard"}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {u > 0 ? formatClubCurrency(u, "US") : "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                          {h > 0 ? formatClubCurrency(h, "HTG") : "-"}
                        </td>
                      </tr>
                    );
                  })
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

function TrackingMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{detail}</p>
        </div>
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
