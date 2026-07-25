"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { PeriodData } from "@/lib/club/statistics";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RegistrationsChartProps {
  data: PeriodData[];
  title: string;
  color?: string;
}

export default function RegistrationsChart({ data, title, color = "#10b981" }: RegistrationsChartProps) {
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
        text: "Inscriptions",
        style: {
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        formatter: (val: number) => {
          if (val === 0) return "0";
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
        formatter: (val: number) => `${val} inscription${val !== 1 ? 's' : ''}`,
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
      name: "Inscriptions",
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