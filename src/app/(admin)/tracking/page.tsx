"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useClubData } from "@/context/ClubDataContext";

const TRACKING_KEY = "club-tracking-active-time-v1";
type Period = "day" | "week" | "month" | "year";
type TimeByDay = Record<string, number>;

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);
const getPeriodStart = (date: Date, period: Period) => {
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

const isInPeriod = (date: Date, period: Period, reference: Date) =>
  date >= getPeriodStart(reference, period) && date <= reference;

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
};

export default function TrackingPage() {
  const { payments } = useClubData();
  const [period, setPeriod] = useState<Period>("day");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [timeByDay, setTimeByDay] = useState<TimeByDay>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(TRACKING_KEY) || "{}");
      setTimeByDay(stored.timeByDay || {});
    } catch {
      setTimeByDay({});
    }

    let startedAt = Date.now();
    let lastRecordedAt = startedAt;
    const recordTime = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - lastRecordedAt) / 1000));
      if (!elapsed) return;
      const key = getDateKey(new Date(lastRecordedAt));
      setTimeByDay((current) => {
        const next = { ...current, [key]: (current[key] || 0) + elapsed };
        localStorage.setItem(TRACKING_KEY, JSON.stringify({ timeByDay: next }));
        return next;
      });
      setActiveSeconds((current) => current + elapsed);
      lastRecordedAt = now;
    };
    const interval = window.setInterval(recordTime, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") recordTime();
      else {
        startedAt = Date.now();
        lastRecordedAt = startedAt;
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

  const periodPayments = useMemo(
    () => payments.filter((payment) => {
      if (payment.statut !== "paid") return false;
      const date = new Date(payment.datePaiement || `${payment.periode}-01`);
      return isInPeriod(date, period, referenceDate);
    }),
    [payments, period, referenceDate],
  );

  const periodTime = useMemo(() => {
    const start = getPeriodStart(referenceDate, period);
    return Object.entries(timeByDay).reduce((total, [key, seconds]) => {
      const date = new Date(`${key}T12:00:00`);
      return date >= start && date <= referenceDate ? total + seconds : total;
    }, 0) + (period === "day" ? activeSeconds : 0);
  }, [timeByDay, activeSeconds, period, referenceDate]);

  const totalUSD = periodPayments
    .filter((payment) => payment.devise === "US")
    .reduce((total, payment) => total + payment.montant, 0);
  const totalHTG = periodPayments
    .filter((payment) => payment.devise === "HTG")
    .reduce((total, payment) => total + payment.montant, 0);

  const periodLabels: Record<Period, string> = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Tracking" />
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Suivi de l'activité</h1>
          <p className="mt-1 text-sm text-gray-500">Reçus, revenus et temps passé dans le système.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="tracking-date" className="text-sm text-gray-500">Date</label>
          <input id="tracking-date" type="date" value={getDateKey(referenceDate)} onChange={(event) => setReferenceDate(new Date(`${event.target.value}T23:59:59`))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(Object.keys(periodLabels) as Period[]).map((value) => (
          <button key={value} type="button" onClick={() => setPeriod(value)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${period === value ? "bg-brand-500 text-white" : "border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"}`}>
            {periodLabels[value]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Reçus" value={String(periodPayments.length)} detail="Paiements validés" />
        <Metric label="Revenus USD" value={`${totalUSD.toLocaleString("fr-FR")} $`} detail="Paiements en dollars" />
        <Metric label="Revenus HTG" value={`${totalHTG.toLocaleString("fr-FR")} G`} detail="Paiements en gourdes" />
        <Metric label="Temps dans le système" value={formatDuration(periodTime)} detail="Temps actif enregistré" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Détail {periodLabels[period].toLowerCase()}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
              <tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Reçus</th><th className="px-3 py-3">USD</th><th className="px-3 py-3">HTG</th></tr>
            </thead>
            <tbody>
              {periodPayments.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Aucun paiement validé pour cette période.</td></tr> : periodPayments.map((payment) => <tr key={payment.id} className="border-b border-gray-50 dark:border-gray-800"><td className="px-3 py-3">{payment.datePaiement || payment.periode}</td><td className="px-3 py-3">1</td><td className="px-3 py-3">{payment.devise === "US" ? payment.montant.toLocaleString("fr-FR") : "-"}</td><td className="px-3 py-3">{payment.devise === "HTG" ? payment.montant.toLocaleString("fr-FR") : "-"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p><p className="mt-1 text-xs text-gray-400">{detail}</p></div>;
}
