"use client";

import React, { useState, useMemo } from "react";
import { useClubData } from "@/context/ClubDataContext";
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
import CombinedRevenueChart from "@/components/club/charts/CombinedRevenueChart";
import RegistrationsChart from "@/components/club/charts/RegistrationsChart";
import { formatClubCurrency } from "@/lib/club/metrics";
import {
  GroupIcon,
  DollarLineIcon,
  CheckCircleIcon,
  CalenderIcon,
  PieChartIcon,
  BoxIconLine,
} from "@/icons";

type PeriodType = "yearly" | "monthly" | "weekly";

export default function StatistiquesPage() {
  const { players, payments } = useClubData();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [periodType, setPeriodType] = useState<PeriodType>("yearly");

  const now = new Date();
  const currentYearActual = now.getFullYear();
  const isAllTime = selectedYear === "all";
  const displayYear = isAllTime ? currentYearActual : parseInt(selectedYear);

  const availableYears = useMemo(() => getAvailableYears(players, payments), [players, payments]);

  // Données annuelles
  const yearlyData = useMemo(() => {
    const revenue = getYearlyRevenue(payments);
    const registrations = getYearlyRegistrations(players);
    return combineYearlyData(revenue, registrations);
  }, [players, payments]);

  // Données mensuelles pour l'année sélectionnée
  const monthlyRevenueData = useMemo(
    () => getMonthlyRevenue(payments, displayYear),
    [payments, displayYear]
  );

  const monthlyRegistrationsData = useMemo(
    () => getMonthlyRegistrations(players, displayYear),
    [players, displayYear]
  );

  // Données hebdomadaires pour l'année sélectionnée
  const weeklyRevenueData = useMemo(
    () => getWeeklyRevenue(payments, displayYear),
    [payments, displayYear]
  );

  const weeklyRegistrationsData = useMemo(
    () => getWeeklyRegistrations(players, displayYear),
    [players, displayYear]
  );

  // Statistiques globales
  const totalRevenueUSD = useMemo(
    () => payments.filter((p) => p.statut === "paid" && p.devise === "USD").reduce((sum, p) => sum + p.montant, 0),
    [payments]
  );

  const totalRevenueHTG = useMemo(
    () => payments.filter((p) => p.statut === "paid" && p.devise === "HTG").reduce((sum, p) => sum + p.montant, 0),
    [payments]
  );

  const totalRegistrations = players.length;
  const activePlayers = players.filter((p) => p.statut === "actif").length;

  // Generate years for filter (2012 to current)
  const yearsList = Array.from({ length: currentYearActual - 2012 + 1 }, (_, i) => currentYearActual - i);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* En-tête */}
      <div className="col-span-12">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Dashboard Analytique</h2>
              <p className="mt-1 text-sm text-white/80">Aperçu complet des données et performances</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg border border-transparent bg-white/10 px-4 py-2.5 text-sm font-medium text-white shadow-none backdrop-blur-sm"
              >
                <option value="all">Historique Global (Depuis création)</option>
                {yearsList.map((y) => (
                  <option key={y} value={y.toString()}>
                    Année {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Style Dashboard */}
      <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-white/20">
                  <DollarLineIcon className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-90">Revenu Total (HTG)</div>
                  <div className="mt-1 text-lg font-bold">{totalRevenueHTG.toLocaleString('fr-FR')} HTG</div>
                </div>
              </div>
              <div className="text-xs text-white/80">Depuis création</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-white/20">
                  <GroupIcon className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-90">Total Inscriptions</div>
                  <div className="mt-1 text-lg font-bold">{totalRegistrations}</div>
                </div>
              </div>
              <div className="text-xs text-white/80">Toutes années</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 bg-gradient-to-r from-orange-400 to-red-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-white/20">
                  <CheckCircleIcon className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-90">Aujourd'hui</div>
                  <div className="mt-1 text-lg font-bold">0</div>
                </div>
              </div>
              <div className="text-xs text-white/80">Transactions</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 bg-gradient-to-r from-green-400 to-emerald-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-white/20">
                  <DollarLineIcon className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-90">Panier Moyen</div>
                  <div className="mt-1 text-lg font-bold">0 HTG</div>
                </div>
              </div>
              <div className="text-xs text-white/80">Moyenne</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles de filtre */}
      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPeriodType("yearly")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  periodType === "yearly"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2"><CalenderIcon className="size-4"/> Annuel</div>
              </button>
              <button
                onClick={() => setPeriodType("monthly")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  periodType === "monthly"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2"><CalenderIcon className="size-4"/> Mensuel</div>
              </button>
              <button
                onClick={() => setPeriodType("weekly")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  periodType === "weekly"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2"><PieChartIcon className="size-4"/> Hebdomadaire</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique combiné USD/HTG - Style Dashboard */}
      {periodType === "yearly" && (
        <div className="col-span-12">
          <CombinedRevenueChart
            data={yearlyData}
            type="yearly"
            title="📈 Revenus par Année"
          />
        </div>
      )}

      {periodType === "monthly" && (
        <div className="col-span-12">
          <CombinedRevenueChart
            data={monthlyRevenueData}
            type="monthly"
            title={`📈 Revenus Mensuels - ${displayYear}`}
          />
        </div>
      )}

      {periodType === "weekly" && (
        <div className="col-span-12">
          <CombinedRevenueChart
            data={weeklyRevenueData}
            type="weekly"
            title={`📈 Revenus Hebdomadaires - ${displayYear}`}
          />
        </div>
      )}

      {/* Graphique des inscriptions */}
      {periodType === "yearly" && (
        <div className="col-span-12">
          <RegistrationsChart
            data={yearlyData.map((item) => ({
              label: item.year.toString(),
              value: item.registrations,
            }))}
            title="👥 Inscriptions par Année"
            color="#10b981"
          />
        </div>
      )}

      {periodType === "monthly" && (
        <div className="col-span-12">
          <RegistrationsChart
            data={monthlyRegistrationsData.map((item) => ({
              label: item.monthLabel,
              value: item.registrations,
            }))}
            title={`👥 Inscriptions - ${displayYear}`}
            color="#10b981"
          />
        </div>
      )}

      {periodType === "weekly" && (
        <div className="col-span-12">
          <RegistrationsChart
            data={weeklyRegistrationsData.map((item) => ({
              label: item.weekLabel,
              value: item.registrations,
            }))}
            title={`👥 Inscriptions - ${displayYear}`}
            color="#10b981"
          />
        </div>
      )}

      {/* Message si aucune donnée */}
      {availableYears.length === 0 && (
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Aucune donnée disponible pour le moment.
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Les statistiques apparaîtront une fois que des joueurs et des paiements auront été enregistrés.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}