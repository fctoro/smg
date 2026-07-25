"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import KpiCardClub from "@/components/club/KpiCardClub";
import PaymentsMonthlyChart from "@/components/club/dashboard/PaymentsMonthlyChart";
import PlayerTable from "@/components/club/PlayerTable";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useClubData } from "@/context/ClubDataContext";
import {
  formatClubCurrency,
  formatClubDate,
  getActivePlayersCount,
  getMonthlyPaymentsSeries,
  getMonthlyPaymentsTotal,
  getRecentPlayers,
  getUpcomingEvents,
  getUpcomingEventsCount,
} from "@/lib/club/metrics";
import { eventTypeLabel, paymentStatusLabel } from "@/lib/club/status";
import { AlertIcon, CalenderIcon, DollarLineIcon, GroupIcon } from "@/icons";

const buildPeriod = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ClubDashboardPage() {
  const router = useRouter();
  const { players, payments, events } = useClubData();
  const { enabledWidgetKeys, enabledPlayerColumns } = useDashboardConfig();

  const now = new Date();
  const currentPeriod = buildPeriod(now);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousPeriod = buildPeriod(previousDate);
  const currentYear = now.getFullYear();

  const activePlayers = getActivePlayersCount(players);
  const currentRevenue = getMonthlyPaymentsTotal(payments, currentPeriod);
  const previousRevenue = getMonthlyPaymentsTotal(payments, previousPeriod);
  const lateCurrentMonth = payments.filter(
    (payment) => payment.periode === currentPeriod && payment.statut === "late",
  ).length;
  const upcomingCount = getUpcomingEventsCount(events, now);
  const paymentSeries = getMonthlyPaymentsSeries(payments, currentYear);
  const recentPlayers = getRecentPlayers(players, 6);
  const upcomingEvents = getUpcomingEvents(events, 4, now);

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

  const tableColumns = useMemo(() => {
    if (enabledPlayerColumns.length > 0) {
      return enabledPlayerColumns;
    }
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

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Dashboard Club
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vue d&apos;ensemble de la vie du club
            </p>
          </div>
          <Link
            href="/parametres/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Configurer le dashboard
          </Link>
        </div>
      </div>

      <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-6">
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
              title="Paiements recus (US$)"
              value={formatClubCurrency(currentRevenue.usd, "US")}
              icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />}
            />
            <KpiCardClub
              title="Paiements recus (HTG)"
              value={formatClubCurrency(currentRevenue.htg, "HTG")}
              icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />}
            />
          </>
        ) : null}

        {enabledWidgetKeys.includes("kpiLatePayments") ? (
          <KpiCardClub
            title="Paiements en retard"
            value={lateCurrentMonth}
            icon={<AlertIcon className="size-6 text-gray-800 dark:text-white/90" />}
          />
        ) : null}

        {enabledWidgetKeys.includes("kpiUpcomingEvents") ? (
          <KpiCardClub
            title="Evenements a venir"
            value={upcomingCount}
            icon={<CalenderIcon className="size-6 text-gray-800 dark:text-white/90" />}
          />
        ) : null}
      </div>

      {enabledWidgetKeys.includes("chartPayments") ? (
        <div className="col-span-12 xl:col-span-8">
          <PaymentsMonthlyChart seriesData={paymentSeries} />
        </div>
      ) : null}

      {enabledWidgetKeys.includes("alerts") ? (
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Alertes
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
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Paiements en retard ce mois:{" "}
                  <span className="font-semibold text-error-600">
                    {lateCurrentMonth}
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Statut cible: {paymentStatusLabel.late}
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
