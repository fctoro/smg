"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PaymentsMonthlyChartProps {
  seriesData: { usd: number[]; htg: number[] };
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

export default function PaymentsMonthlyChart({
  seriesData,
}: PaymentsMonthlyChartProps) {
  const options: ApexOptions = {
    colors: ["#465fff", "#10b981"],
    chart: {
      type: "bar",
      height: 260,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "44%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: monthLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${value}`,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value: number, { seriesIndex }) => 
          seriesIndex === 0 ? `US$${value}` : `${value} Gourdes`,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Paiements mensuels
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cotisations encaissees sur l&apos;annee en cours
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
          <ReactApexChart
            options={options}
            series={[
              { name: "Paiements (US$)", data: seriesData.usd },
              { name: "Paiements (Gourdes)", data: seriesData.htg },
            ]}
            type="bar"
            height={260}
          />
        </div>
      </div>
    </div>
  );
}
