"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { PeriodData } from "@/lib/club/statistics";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RevenueChartProps {
  data: PeriodData[];
  title: string;
  color?: string;
  currency?: "USD" | "HTG";
}

export default function RevenueChart({ data, title, color = "#465fff", currency = "USD" }: RevenueChartProps) {
  const currencySymbol = currency === "USD" ? "$" : "G";
  const currencyLabel = currency === "USD" ? "USD" : "HTG";

  const options: ApexOptions = {
    colors: [color],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 300,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 6,
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
      categories: data.map((item) => item.label),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "11px",
        },
      },
    },
    yaxis: {
      title: {
        text: `${currencyLabel}`,
        style: {
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        formatter: (val: number) => {
          if (val === 0) return "0";
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
          return val.toString();
        },
        style: {
          fontSize: "11px",
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${currencySymbol}${val.toLocaleString()}`,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
  };

  const series = [
    {
      name: "Revenu",
      data: data.map((item) => item.value),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        {title}
      </h3>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px]">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={350}
          />
        </div>
      </div>
    </div>
  );
}