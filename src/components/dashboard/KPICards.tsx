"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, DollarSign, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { DashboardStats } from "@/types";

interface KPICardsProps {
  stats: DashboardStats;
}

interface CardItem {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
}

export function KPICards({ stats }: KPICardsProps) {
  const cards: CardItem[] = [
    {
      title: "Total Contactos",
      value: stats.totalContacts.toString(),
      subtitle: `+${stats.newLeadsThisWeek} esta semana`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Deals Activos",
      value: stats.activeDeals.toString(),
      subtitle: `Tasa cierre: ${stats.conversionRate}%`,
      icon: Briefcase,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Valor en Pipeline",
      value: formatCurrency(stats.totalPipelineValue),
      subtitle: `Ganado: ${formatCurrency(stats.wonDealsValue)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Leads Calientes",
      value: stats.hotLeads.toString(),
      subtitle: `${stats.uncontactedLeads} sin contactar`,
      icon: Flame,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
