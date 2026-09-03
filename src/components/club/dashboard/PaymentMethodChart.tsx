"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export interface PaymentMethodItem {
  method: string;
  totalUS: number;
  totalHTG: number;
  count?: number;
  pendingCount?: number;
}

interface PaymentMethodChartProps {
  methodData: PaymentMethodItem[];
  pendingCount?: number;
}

const formatMethodInfo = (method: string) => {
  const m = (method || "").toLowerCase().trim();
  switch (m) {
    case "virement":
      return {
        name: "Virement bancaire",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
        ),
      };
    case "depot":
    case "dépôt":
    case "depot bancaire":
    case "dépôt bancaire":
      return {
        name: "Dépôt bancaire",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      };
    case "especes":
    case "espèces":
    case "cash":
      return {
        name: "Cash / Espèces",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      };
    case "cheque":
    case "chèque":
      return {
        name: "Chèque",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      };
    case "carte":
    case "carte de credit":
      return {
        name: "Carte de crédit",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      };
    case "mobile":
    case "moncash":
      return {
        name: "MonCash / Mobile",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      };
    case "natcash":
      return {
        name: "NatCash",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      };
    default:
      return {
        name: m ? m.charAt(0).toUpperCase() + m.slice(1) : "Autre",
        icon: (
          <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
};

export default function PaymentMethodChart({
  methodData,
  pendingCount = 0,
}: PaymentMethodChartProps) {
  const hasData = methodData && methodData.length > 0;

  // Calculs des métriques de synthèse
  const totalUSAll = hasData ? methodData.reduce((acc, curr) => acc + (curr.totalUS || 0), 0) : 0;
  const totalHTGAll = hasData ? methodData.reduce((acc, curr) => acc + (curr.totalHTG || 0), 0) : 0;
  const totalCountAll = hasData ? methodData.reduce((acc, curr) => acc + (curr.count || 0), 0) : 0;

  const categories = hasData
    ? methodData.map((d) => formatMethodInfo(d.method).name)
    : ["Virement bancaire", "Cash / Espèces"];

  const seriesUS = hasData ? methodData.map((d) => d.totalUS) : [0, 0];
  const seriesHTG = hasData ? methodData.map((d) => d.totalHTG) : [0, 0];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
    },
    colors: ["#10b981", "#3b82f6"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
        formatter: (val) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
          return `${val}`;
        },
      },
    },
    grid: {
      borderColor: "rgba(148, 163, 184, 0.1)",
      strokeDashArray: 4,
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "13px",
      fontWeight: 600,
      labels: {
        colors: "#94a3b8",
      },
      markers: {
        size: 6,
      },
    },
    tooltip: {
      theme: "light",
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const item = methodData[dataPointIndex];
        const methodName = categories[dataPointIndex] || "";
        const usVal = item ? item.totalUS.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "0.00";
        const htgVal = item ? item.totalHTG.toLocaleString("fr-FR") : "0";
        const countVal = item?.count || 0;
        const pendingVal = item?.pendingCount || 0;

        return `
          <div style="padding: 12px; background: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 12px; border: 1px solid #e2e8f0; font-size: 12px; font-family: inherit;">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
              ${methodName}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; gap: 16px; color: #059669; font-weight: 600;">
                <span>USD:</span>
                <span>$ ${usVal}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; color: #2563eb; font-weight: 600;">
                <span>HTG:</span>
                <span>${htgVal} HTG</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; color: #334155; font-weight: 700; padding-top: 4px; border-top: 1px solid #f1f5f9;">
                <span>Validés:</span>
                <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${countVal} paiement${countVal > 1 ? "s" : ""}</span>
              </div>
              ${pendingVal > 0 ? `
              <div style="display: flex; justify-content: space-between; gap: 16px; color: #d97706; font-weight: 700;">
                <span>En attente:</span>
                <span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">${pendingVal}</span>
              </div>` : ""}
            </div>
          </div>
        `;
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-xs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Méthodes de Paiement
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Répartition analytique et nombre de transactions par mode de règlement
            </p>
          </div>
        </div>

        {/* Summary Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">TOTAL VALIDÉS</span>
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {totalCountAll}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider italic">EN ATTENTE</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 italic">
              {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of payment method badges showing exact counts */}
      {hasData && (
        <div className={`mb-6 grid gap-3.5 ${
          methodData.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
          methodData.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}>
          {methodData.map((item) => {
            const { name, icon } = formatMethodInfo(item.method);
            const count = item.count || 0;
            const itemPending = item.pendingCount || 0;
            return (
              <Link
                key={item.method}
                href={`/paiements?methode=${encodeURIComponent(item.method)}`}
                className="group rounded-xl border border-gray-200/90 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30 flex flex-col justify-between transition-all hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-800/80 dark:hover:border-gray-700 cursor-pointer shadow-2xs"
                title={`Cliquer pour voir la liste des paiements ${name}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    <span className="p-1 rounded-md bg-white dark:bg-gray-700/50 border border-gray-200/80 dark:border-gray-700 shadow-2xs">
                      {icon}
                    </span>
                    {name}
                  </span>
                  {itemPending > 0 && (
                    <span className="text-xs italic text-gray-500 dark:text-gray-400">
                      ({itemPending} en attente)
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-gray-100 dark:border-gray-800/60">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {count}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      paiement{count > 1 ? "s" : ""} validé{count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-0.5">
                    Voir <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="relative min-h-[300px] w-full">
        {!hasData ? (
          <div className="flex h-[280px] w-full flex-col items-center justify-center text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm font-medium">Aucun paiement enregistré pour cette période</span>
          </div>
        ) : (
          <ReactApexChart
            options={options}
            series={[
              { name: "USD ($)", data: seriesUS },
              { name: "HTG", data: seriesHTG },
            ]}
            type="bar"
            height={300}
          />
        )}
      </div>
    </div>
  );
}
