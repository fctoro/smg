"use client";

import React, { useState, useMemo } from "react";
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
  getAvailableYears,
  combineYearlyData,
} from "@/lib/club/statistics";
import {
  GroupIcon,
  DollarLineIcon,
  CheckCircleIcon,
  DownloadIcon,
} from "@/icons";

export default function StatistiquesPage() {
  const { players, payments } = useClubData();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [periodType, setPeriodType] = useState<'yearly' | 'monthly' | 'weekly'>("yearly");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const now = new Date();
  const currentYearActual = now.getFullYear();
  const isAllTime = selectedYear === "all";
  const displayYear = isAllTime ? currentYearActual : parseInt(selectedYear || String(currentYearActual), 10);

  const isUSDDevise = (devise?: "US" | "HTG"): boolean => {
    return String(devise || "").toUpperCase() === "US";
  };

  // apply filters to payments/players
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // status filter
      if (statusFilter !== "all" && p.statut !== statusFilter) return false;
      // date filters (use datePaiement or periode)
      const dateStr = p.datePaiement || p.periode || null;
      if (dateFrom && dateStr) {
        const from = new Date(dateFrom);
        const d = new Date(dateStr);
        if (d < from) return false;
      }
      if (dateTo && dateStr) {
        const to = new Date(dateTo);
        const d = new Date(dateStr);
        if (d > to) return false;
      }
      return true;
    });
  }, [payments, dateFrom, dateTo, statusFilter]);

  const filteredPlayers = useMemo(() => {
    return players.filter((pl) => {
      if (!dateFrom && !dateTo) return true;
      const d = new Date(pl.dateInscription);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo)) return false;
      return true;
    });
  }, [players, dateFrom, dateTo]);

  // quick aggregations
  const availableYears = useMemo(() => getAvailableYears(filteredPlayers, filteredPayments), [filteredPlayers, filteredPayments]);

  const totalRevenueHTG = useMemo(
    () => filteredPayments
      .filter((p) => p.statut === "paid" && p.devise === "HTG")
      .reduce((sum, p) => sum + (p.montantHTG || (p.devise === "HTG" ? p.montant : 0) || 0), 0),
    [filteredPayments]
  );
  const totalRevenueUSD = useMemo(
    () => filteredPayments
      .filter((p) => p.statut === "paid" && isUSDDevise(p.devise))
      .reduce((sum, p) => sum + (p.montantUS || (isUSDDevise(p.devise) ? p.montant : 0) || 0), 0),
    [filteredPayments]
  );
  const totalRegistrations = filteredPlayers.length;
  const totalPayments = filteredPayments.length;

  // Calculate player status statistics from the persisted player status.
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

  // CSV export helper
  const exportPaymentsCSV = (rows: typeof payments) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // statistics data
  const yearlyData = useMemo(() => {
    const revenue = getYearlyRevenue(filteredPayments);
    const registrations = getYearlyRegistrations(filteredPlayers);
    return combineYearlyData(revenue, registrations);
  }, [filteredPayments, filteredPlayers]);

  const monthlyRevenueData = useMemo(() => getMonthlyRevenue(filteredPayments, displayYear), [filteredPayments, displayYear]);
  const monthlyRegistrationsData = useMemo(() => getMonthlyRegistrations(filteredPlayers, displayYear), [filteredPlayers, displayYear]);

  const weeklyRevenueData = useMemo(() => getWeeklyRevenue(filteredPayments, displayYear), [filteredPayments, displayYear]);
  const weeklyRegistrationsData = useMemo(() => getWeeklyRegistrations(filteredPlayers, displayYear), [filteredPlayers, displayYear]);

  const hasYearlyRevenue = yearlyData.some((d) => d.revenueUSD > 0 || d.revenueHTG > 0);
  const hasMonthlyRevenue = monthlyRevenueData.some((d) => d.revenueUSD > 0 || d.revenueHTG > 0);
  const hasWeeklyRevenue = weeklyRevenueData.some((d) => d.revenueUSD > 0 || d.revenueHTG > 0);
  const hasRegistrations = periodType === 'monthly'
    ? monthlyRegistrationsData.some((d) => d.registrations > 0)
    : periodType === 'weekly'
    ? weeklyRegistrationsData.some((d) => d.registrations > 0)
    : yearlyData.some((d) => d.registrations > 0);

  return (
    <div className="space-y-6">
      {/* Top header */}
      <div className="rounded-2xl bg-slate-900 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Analytique</h1>
            <p className="text-sm text-slate-300">Aperçu complet des performances et finances du club</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-md bg-slate-800 px-3 py-2 text-sm">Actualiser</button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-md bg-white/10 px-3 py-2 text-sm"
            >
              <option value="all">Historique Global</option>
              {yearsList.map((y) => (
                <option key={y} value={y.toString()}>
                  Année {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Depuis</label>
            <input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} type="date" className="rounded-md border px-2 py-1 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Jusqu'à</label>
            <input value={dateTo} onChange={(e) => setDateTo(e.target.value)} type="date" className="rounded-md border px-2 py-1 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border px-2 py-1 text-sm">
              <option value="all">Tous</option>
              <option value="paid">Paid</option>
              <option value="late">Late</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => exportPaymentsCSV(filteredPayments)} className="rounded-md border px-3 py-2 text-sm flex items-center gap-2"><DownloadIcon className="size-4"/> CSV</button>
            <button onClick={() => exportPaymentsCSV(filteredPayments)} className="rounded-md border px-3 py-2 text-sm">Exporter</button>
          </div>
        </div>
      </div>

      {/* Main layout: big chart + KPI cards */}
      <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Revenus</h3>
                <p className="text-sm text-gray-500">Montants réels en USD et HTG selon les paiements validés</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <button
                  onClick={() => setPeriodType('yearly')}
                  className={`px-3 py-1 rounded-md border ${periodType === 'yearly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}
                >
                  Annuel
                </button>
                <button
                  onClick={() => setPeriodType('monthly')}
                  className={`px-3 py-1 rounded-md border ${periodType === 'monthly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setPeriodType('weekly')}
                  className={`px-3 py-1 rounded-md border ${periodType === 'weekly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600'}`}
                >
                  Hebdomadaire
                </button>
              </div>
            </div>
            <CombinedRevenueChart
              data={
                periodType === 'monthly' ? monthlyRevenueData : periodType === 'weekly' ? weeklyRevenueData : yearlyData
              }
              type={periodType === 'monthly' ? 'monthly' : periodType === 'weekly' ? 'weekly' : 'yearly'}
              title={
                periodType === 'monthly'
                  ? `Revenus mensuels — ${displayYear}`
                  : periodType === 'weekly'
                  ? `Revenus hebdomadaires — ${displayYear}`
                  : 'Revenus annuels'
              }
            />
          </div>
        </div>

         <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Revenu Total (USD)</div>
                <div className="text-2xl font-bold text-gray-800">{formatClubCurrency(totalRevenueUSD, "US")}</div>
                <div className="text-sm text-gray-500 mt-1">{formatClubCurrency(totalRevenueHTG, "HTG")}</div>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-blue-50">
                <DollarLineIcon className="size-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Inscriptions</div>
                <div className="text-2xl font-bold text-gray-800">{totalRegistrations}</div>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-purple-50">
                <GroupIcon className="size-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Paiements filtrés</div>
                <div className="text-2xl font-bold text-gray-800">{totalPayments}</div>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-amber-50">
                <CheckCircleIcon className="size-5 text-amber-600" />
              </div>
            </div>
          </div>

          {Object.keys(playerStatusStats).length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="text-xs text-gray-400 mb-3">Statuts des joueurs</div>
              <div className="space-y-2">
                {Object.entries(playerStatusStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{status}</span>
                      <span className="text-xl font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary widgets grid */}
      <div className="grid grid-cols-12 gap-4">
        {hasYearlyRevenue && (
          <div className="col-span-12 lg:col-span-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h4 className="text-sm font-semibold mb-3">Revenus annuels</h4>
              <CombinedRevenueChart data={yearlyData} type="yearly" title="Revenus annuels" />
            </div>
          </div>
        )}

        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h4 className="text-sm font-semibold mb-3">Inscriptions</h4>
            <RegistrationsChart
              data={
                periodType === 'monthly'
                  ? monthlyRegistrationsData.map((it) => ({ label: it.monthLabel, value: it.registrations }))
                  : periodType === 'weekly'
                  ? weeklyRegistrationsData.map((it) => ({ label: it.weekLabel, value: it.registrations }))
                  : yearlyData.map((it) => ({ label: it.year.toString(), value: it.registrations }))
              }
              title={periodType === 'monthly' ? `Inscriptions — ${displayYear}` : periodType === 'weekly' ? `Inscriptions — ${displayYear}` : 'Inscriptions par année'}
              color="#10b981"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
