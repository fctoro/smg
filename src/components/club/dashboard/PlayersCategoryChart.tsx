"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PlayersCategoryChartProps {
  categoriesData: { label: string; count: number }[];
}

export default function PlayersCategoryChart({
  categoriesData,
}: PlayersCategoryChartProps) {
  const series = categoriesData.map(d => d.count);
  const labels = categoriesData.map(d => d.label);

  const options: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"],
    labels: labels,
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
            },
            value: {
              show: true,
              formatter: (val) => val,
            },
            total: {
              show: true,
              label: "Total",
              formatter: (w) => {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
              }
            }
          }
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      colors: ["transparent"],
      width: 2,
    },
    legend: {
      position: "bottom",
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} Joueurs`,
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Répartition des Joueurs
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Par catégorie
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ReactApexChart
          options={options}
          series={series}
          type="donut"
          height={320}
        />
      </div>
    </div>
  );
}
