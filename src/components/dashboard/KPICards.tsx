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
            className="rounded-lg bg-white shadow-card px-4 py-4 hover:shadow-card-hover transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                {card.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-[#a3a3a3]" />
            </div>
            <div className="text-[28px] font-semibold tracking-tight text-[#171717] leading-none mb-2">
              {card.value}
            </div>
            <div className="flex items-center gap-1">
              {card.positive && <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />}
              <span className="text-[11px] text-[#737373]">{card.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
