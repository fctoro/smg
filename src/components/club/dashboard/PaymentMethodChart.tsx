"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PaymentMethodChartProps {
  methodData: { method: string; totalUS: number; totalHTG: number }[];
}

export default function PaymentMethodChart({
  methodData,
}: PaymentMethodChartProps) {
  const categories = methodData.map(d => d.method.charAt(0).toUpperCase() + d.method.slice(1));
  const seriesUS = methodData.map(d => d.totalUS);
  const seriesHTG = methodData.map(d => d.totalHTG);

  const options: ApexOptions = {
    chart: {
      type: "radar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    colors: ["#10b981", "#3b82f6"],
    labels: categories,
    stroke: {
      width: 2,
    },
    fill: {
      opacity: 0.2,
    },
    markers: {
      size: 4,
    },
    yaxis: {
      show: false,
    },
    legend: {
      position: "bottom",
    },
    tooltip: {
      y: {
        formatter: (val, { seriesIndex }) => {
          return seriesIndex === 0 ? `$${val}` : `${val} HTG`;
        }
      }
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Méthodes de Paiement
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Répartition des transactions
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ReactApexChart
          options={options}
          series={[
            { name: "USD", data: seriesUS },
            { name: "HTG", data: seriesHTG },
          ]}
          type="radar"
          height={320}
        />
      </div>
    </div>
  );
}
