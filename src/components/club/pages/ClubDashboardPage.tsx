"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import KpiCardClub from "@/components/club/KpiCardClub";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import {
  formatClubCurrency,
  formatClubDate,
  getActivePlayersCount,
  getMonthlyPaymentsSeries,
  getMonthlyPaymentsTotalUS,
  getMonthlyPaymentsTotalHTG,
  getRecentPlayers,
  getUpcomingEvents,
  getUpcomingEventsCount,
} from "@/lib/club/metrics";
import { eventTypeLabel, paymentStatusLabel } from "@/lib/club/status";
import { AlertIcon, CalenderIcon, DollarLineIcon, GroupIcon } from "@/icons";

// New Charts
import RevenueChart from "@/components/club/dashboard/RevenueChart";
import PlayersCategoryChart from "@/components/club/dashboard/PlayersCategoryChart";
import PaymentMethodChart from "@/components/club/dashboard/PaymentMethodChart";

const buildPeriod = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ClubDashboardPage() {
  const router = useRouter();
  const { players, payments, events } = useClubData();
  const { enabledWidgetKeys, enabledPlayerColumns } = useDashboardConfig();

  const now = new Date();
  const currentYearActual = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const isAllTime = selectedYear === "all";
  const displayYear = isAllTime ? currentYearActual : parseInt(selectedYear);

  const currentPeriod = buildPeriod(now); // Used as reference for 'ce mois' if looking at current year
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousPeriod = buildPeriod(previousDate);

  const activePlayers = getActivePlayersCount(players);
  
  // Si on est sur une année spécifique, on montre "Revenus de l'année" au lieu de "ce mois"?
  // La requête disait : "je dois recupeer tout les data par moi anne des la creations"
  // Je vais ajuster pour que si "all", on montre le total cumulé, sinon le total de l'année
  const currentRevenueUS = payments
    .filter(p => p.statut === "paid" && (isAllTime || p.periode.startsWith(selectedYear)))
    .reduce((sum, p) => sum + (p.montantUS || 0), 0);
    
  const previousRevenueUS = 0; // Pas de variation si on montre l'année ou tout
  
  const currentRevenueHTG = payments
    .filter(p => p.statut === "paid" && (isAllTime || p.periode.startsWith(selectedYear)))
    .reduce((sum, p) => sum + (p.montantHTG || 0), 0);
    
  const previousRevenueHTG = 0;
  
  const lateCurrentMonth = payments.filter(
    (payment) => payment.statut === "late" && (isAllTime || payment.periode.startsWith(selectedYear))
  ).length;
  const upcomingCount = getUpcomingEventsCount(events, now);
  
  // Chart Series Data (now passing selectedYear)
  const paymentSeries = getMonthlyPaymentsSeries(payments, isAllTime ? "all" : displayYear);
  
  const recentPlayers = getRecentPlayers(players, 6);
  const upcomingEvents = getUpcomingEvents(events, 4, now);

<<<<<<< HEAD
  const revenueTrend = useMemo(() => {
    const curr = currentRevenue.usd > 0 || currentRevenue.htg === 0 ? currentRevenue.usd : currentRevenue.htg;
    const prev = previousRevenue.usd > 0 || previousRevenue.htg === 0 ? previousRevenue.usd : previousRevenue.htg;
    
    if (prev === 0) {
      return { value: "Nouveau", direction: "up" as const };
    }
    const variation = ((curr - prev) / prev) * 100;
    return {
      value: `${Math.abs(variation).toFixed(1)}%`,
      direction: variation >= 0 ? ("up" as const) : ("down" as const),
    };
  }, [currentRevenue, previousRevenue]);
=======
  const revenueTrendUS = { value: "", direction: "up" as const };
  const revenueTrendHTG = { value: "", direction: "up" as const };

  // Player Categories Data
  const categoriesData = useMemo(() => {
    const cats: Record<string, number> = {};
    players.forEach(p => {
      if (p.statut === "actif") {
        cats[p.categorie] = (cats[p.categorie] || 0) + 1;
      }
    });
    return Object.keys(cats).map(cat => ({ label: cat || "Autre", count: cats[cat] }));
  }, [players]);

  // Payment Methods Data
  const methodData = useMemo(() => {
    const methods: Record<string, { totalUS: number; totalHTG: number }> = {};
    payments.forEach(p => {
      if (p.statut === "paid" && (isAllTime || p.periode.startsWith(selectedYear))) {
        if (!methods[p.methode]) methods[p.methode] = { totalUS: 0, totalHTG: 0 };
        methods[p.methode].totalUS += (p.montantUS || 0);
        methods[p.methode].totalHTG += (p.montantHTG || 0);
      }
    });
    return Object.keys(methods).map(m => ({
      method: m,
      totalUS: methods[m].totalUS,
      totalHTG: methods[m].totalHTG
    }));
  }, [payments, selectedYear, isAllTime]);
>>>>>>> 1726d6c (feat: refonte du Dashboard analytique avec ApexCharts, séparation US/HTG et correctifs dates)

  const tableColumns = useMemo(() => {
    if (enabledPlayerColumns.length > 0) return enabledPlayerColumns;
    return [
      "avatarNom",
      "categorie",
      "statut",
      "cotisation",
      "montant",
      "dernierPaiement",
      "actions",
    ] as const;
  }, [enabledPlayerColumns]);

  // Generate years for filter (2012 to current)
  const yearsList = Array.from({ length: currentYearActual - 2012 + 1 }, (_, i) => currentYearActual - i);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Dashboard Analytique
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vue d&apos;ensemble des performances et finances du club
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">Historique Global (Depuis création)</option>
              {yearsList.map((y) => (
                <option key={y} value={y.toString()}>
                  Année {y}
                </option>
              ))}
            </select>
            <Link
              href="/parametres/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Configurer
            </Link>
          </div>
        </div>
      </div>

      <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {enabledWidgetKeys.includes("kpiMembers") ? (
          <KpiCardClub
            title="Joueurs actifs"
            value={activePlayers}
            icon={<GroupIcon className="size-6 text-gray-800 dark:text-white/90" />}
          />
        ) : null}

        {enabledWidgetKeys.includes("kpiRevenue") ? (
          <>
            <KpiCardClub
              title={isAllTime ? "Revenus Globaux (USD)" : `Revenus (USD) ${displayYear}`}
              value={formatClubCurrency(currentRevenueUS)}
              trend={isAllTime ? undefined : revenueTrendUS}
              icon={
                <DollarLineIcon className="size-6 text-emerald-500" />
              }
            />
            <KpiCardClub
              title={isAllTime ? "Revenus Globaux (HTG)" : `Revenus (HTG) ${displayYear}`}
              value={`${currentRevenueHTG.toLocaleString('fr-FR')} HTG`}
              trend={isAllTime ? undefined : revenueTrendHTG}
              icon={
                <DollarLineIcon className="size-6 text-blue-500" />
              }
            />
          </>
        ) : null}
      </div>

      {/* Main Charts */}
      {enabledWidgetKeys.includes("chartPayments") ? (
        <div className="col-span-12 lg:col-span-8">
          <RevenueChart 
            seriesDataUS={paymentSeries.dataUS} 
            seriesDataHTG={paymentSeries.dataHTG} 
          />
        </div>
      ) : null}

      <div className="col-span-12 lg:col-span-4 space-y-4 md:space-y-6">
        <PlayersCategoryChart categoriesData={categoriesData} />
      </div>

      <div className="col-span-12 lg:col-span-8">
        <PaymentMethodChart methodData={methodData} />
      </div>

      {enabledWidgetKeys.includes("alerts") ? (
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Alertes & Agenda
            </h3>
            <div className="mt-4 space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {event.titre}
                    </p>
                    <Badge size="sm" color="info">
                      {eventTypeLabel[event.type]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatClubDate(event.date)}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/30 dark:bg-rose-900/10">
                <div className="flex items-center gap-2">
                  <AlertIcon className="size-4 text-rose-600 dark:text-rose-400" />
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Paiements en retard
                  </p>
                </div>
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {lateCurrentMonth} retard(s) signalé(s) ce mois-ci.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {enabledWidgetKeys.includes("tablePlayers") ? (
        <div className="col-span-12">
          <PlayerTable
            players={recentPlayers}
            columns={[...tableColumns]}
            title="Derniers joueurs inscrits"
            showToolbar={false}
            pageSize={6}
            onViewPlayer={(player) => router.push(`/joueurs/${player.id}`)}
            onEditPlayer={(player) => router.push(`/joueurs/${player.id}/modifier`)}
          />
        </div>
      ) : null}
    </div>
  );
}
