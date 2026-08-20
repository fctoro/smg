"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PaymentMethodChartProps {
  methodData: { method: string; totalUS: number; totalHTG: number }[];
}

const formatMethodName = (method: string) => {
  if (!method) return "Autre";
  const m = method.toLowerCase().trim();
  switch (m) {
    case "virement":
      return "Virement bancaire";
    case "especes":
    case "espèces":
      return "Espèces";
    case "cheque":
    case "chèque":
      return "Chèque";
    case "carte":
      return "Carte bancaire";
    case "mobile":
    case "depot":
    case "dépôt":
      return "Dépôt bancaire";
    case "moncash":
      return "MonCash";
    case "natcash":
      return "NatCash";
    default:
      return m.charAt(0).toUpperCase() + m.slice(1);
  }
};

export default function PaymentMethodChart({
  methodData,
}: PaymentMethodChartProps) {
  const hasData = methodData && methodData.length > 0;

  // Calculs des métriques de synthèse
  const totalUSAll = hasData ? methodData.reduce((acc, curr) => acc + (curr.totalUS || 0), 0) : 0;
  const totalHTGAll = hasData ? methodData.reduce((acc, curr) => acc + (curr.totalHTG || 0), 0) : 0;

  const topMethodObj = hasData
    ? [...methodData].sort((a, b) => (b.totalUS + b.totalHTG) - (a.totalUS + a.totalHTG))[0]
    : null;

  const categories = hasData
    ? methodData.map((d) => formatMethodName(d.method))
    : ["Virement bancaire", "Espèces"];

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
      y: {
        formatter: (val, { seriesIndex }) => {
          return seriesIndex === 0
            ? `$ ${val.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`
            : `${val.toLocaleString("fr-FR")} HTG`;
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-xs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Méthodes de Paiement
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Répartition analytique des transactions par mode de règlement
            </p>
          </div>
        </div>

        {/* Summary Pills - Simple, propre et professionnel */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">TOTAL USD</span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              $ {totalUSAll.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">TOTAL HTG</span>
            <span className="text-xs font-black text-blue-700 dark:text-blue-300">
              {totalHTGAll.toLocaleString("fr-FR")} HTG
            </span>
          </div>

          {topMethodObj && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">TOP MODE</span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {formatMethodName(topMethodObj.method)}
              </span>
            </div>
          )}
        </div>
      </div>

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
