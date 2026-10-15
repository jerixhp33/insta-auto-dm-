import React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: number | string;
  growth?: number;
  suffix?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({ title, value, growth, suffix, icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = growth !== undefined && growth >= 0;

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 mb-1.5 tabular-nums">
          {typeof value === "number" ? formatNumber(value) : value}
          {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
        </p>
        {growth !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-500")}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(growth)}% from last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
