"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { MonthlyData, WeeklyData, YearlyData } from "@/lib/club/statistics";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface CombinedRevenueChartProps {
  data: any[];
  type: "daily" | "monthly" | "weekly" | "yearly";
  title: string;
}

export default function CombinedRevenueChart({ data, type, title }: CombinedRevenueChartProps) {
  const labels = data.map((item) => {
    if ("dayLabel" in item) return item.dayLabel;
    if ("monthLabel" in item) return item.monthLabel;
    if ("weekLabel" in item) return item.weekLabel;
    return item.year ? item.year.toString() : (item.day || "");
  });

  const seriesUSD = data.map((item) => item.revenueUSD);
  const seriesHTG = data.map((item) => item.revenueHTG);

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
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "11px",
        },
      },
    },
    yaxis: [
      {
        seriesName: "USD",
        labels: {
          formatter: (value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
          },
          style: {
            colors: "#10b981",
            fontSize: "11px",
          },
        },
      },
      {
        seriesName: "HTG",
        opposite: true,
        labels: {
          formatter: (value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return `${value}G`;
          },
          style: {
            colors: "#3b82f6",
            fontSize: "11px",
          },
        },
      },
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
        { formatter: (value: number) => `$${value.toLocaleString()}` },
        { formatter: (value: number) => `${value.toLocaleString()} HTG` }
      ]
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-2 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comparaison des revenus USD et HTG
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
          <ReactApexChart
            options={options}
            series={[
              { name: "USD ($)", data: seriesUSD },
              { name: "Gourdes (HTG)", data: seriesHTG }
            ]}
            type="area"
            height={320}
          />
        </div>
      </div>
    </div>
  );
}