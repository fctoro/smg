"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RevenueChartProps {
  seriesDataUS: number[];
  seriesDataHTG: number[];
}

const monthLabels = [
  "Jan",
  "Fev",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aou",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function RevenueChart({
  seriesDataUS,
  seriesDataHTG,
}: RevenueChartProps) {
  const options: ApexOptions = {
    colors: ["#10b981", "#3b82f6"], // Green for USD, Blue for HTG
    chart: {
      type: "area",
      height: 320,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: monthLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#9ca3af",
        }
      }
    },
    yaxis: [
      {
        seriesName: "USD",
        labels: {
          formatter: (value) => `$${value}`,
          style: {
            colors: "#10b981",
          }
        },
      },
      {
        seriesName: "HTG",
        opposite: true,
        labels: {
          formatter: (value) => `${value}G`,
          style: {
            colors: "#3b82f6",
          }
        },
      }
    ],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      y: [
        { formatter: (value: number) => `$${value}` },
        { formatter: (value: number) => `${value} HTG` }
      ]
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-2 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Revenus Mensuels
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comparaison des paiements en USD et HTG
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
          <ReactApexChart
            options={options}
            series={[
              { name: "USD ($)", data: seriesDataUS },
              { name: "Gourdes (HTG)", data: seriesDataHTG }
            ]}
            type="area"
            height={320}
          />
        </div>
      </div>
    </div>
  );
}
