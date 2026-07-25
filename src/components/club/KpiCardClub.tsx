import React from "react";
import Badge from "@/components/ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons";

type TrendDirection = "up" | "down" | "neutral";

interface KpiCardClubProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: TrendDirection;
  };
}

const badgeColorFromDirection = (direction: TrendDirection) => {
  if (direction === "up") {
    return "success";
  }
  if (direction === "down") {
    return "error";
  }
  return "light";
};

export default function KpiCardClub({
  title,
  value,
  icon,
  trend,
}: KpiCardClubProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800">
        {icon}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
          <h4 className="mt-2 font-bold text-gray-800 dark:text-white/90 text-title-sm">
            {value}
          </h4>
        </div>
        {trend ? (
          <Badge color={badgeColorFromDirection(trend.direction)}>
            {trend.direction === "up" ? <ArrowUpIcon /> : null}
            {trend.direction === "down" ? (
              <ArrowDownIcon className="text-error-500" />
            ) : null}
            {trend.value}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
