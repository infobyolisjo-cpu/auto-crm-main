"use client";

import { Users, Briefcase, DollarSign, Flame, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { DashboardStats } from "@/types";

interface KPICardsProps {
  stats: DashboardStats;
}

const cards = (stats: DashboardStats) => [
  {
    label: "Contactos",
    value: stats.totalContacts.toString(),
    sub: `+${stats.newLeadsThisWeek} esta semana`,
    icon: Users,
    positive: stats.newLeadsThisWeek > 0,
  },
  {
    label: "Deals activos",
    value: stats.activeDeals.toString(),
    sub: `${stats.conversionRate}% conversión`,
    icon: Briefcase,
    positive: stats.conversionRate > 20,
  },
  {
    label: "Pipeline",
    value: formatCurrency(stats.totalPipelineValue),
    sub: `${formatCurrency(stats.wonDealsValue)} ganado`,
    icon: DollarSign,
    positive: stats.wonDealsValue > 0,
  },
  {
    label: "Leads calientes",
    value: stats.hotLeads.toString(),
    sub: `${stats.uncontactedLeads} sin contactar`,
    icon: Flame,
    positive: stats.hotLeads > 0,
  },
];

export function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards(stats).map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card px-4 py-4 hover:shadow-sm transition-shadow duration-150"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
            <div className="flex items-center gap-1 mt-1.5">
              {card.positive && <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />}
              <span className="text-[11px] text-muted-foreground">{card.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
