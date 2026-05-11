"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DealForm } from "@/components/deals/DealForm";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import type { Temperature } from "@/types";
import { apiFetch } from "@/lib/api-fetch";

interface DealRow {
  id: string;
  title: string;
  value: number;
  probability: number;
  contactName: string | null;
  contactTemperature: string | null;
  stageName: string | null;
  stageColor: string | null;
  expectedClose: number | Date | null;
  createdAt: number | Date;
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/deals")
      .then((res) => res.json())
      .then((data) => { setDeals(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [showForm]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Oportunidades de venta activas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
                const res = await apiFetch("/api/export?type=deals");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `deals-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            className="text-[12px] px-2.5 py-1.5 rounded-md font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo deal
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Sin deals aún"
          description="Crea tu primer deal para empezar a gestionar el pipeline."
          actionLabel="Crear deal"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Deal</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden sm:table-cell">Contacto</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Valor</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Etapa</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden md:table-cell">Prob.</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden lg:table-cell">Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors duration-100 group"
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium group-hover:text-primary transition-colors">{deal.title}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      {deal.contactName && (
                        <span className="text-[13px] text-foreground/65">{deal.contactName}</span>
                      )}
                      {deal.contactTemperature && (
                        <StatusBadge temperature={deal.contactTemperature as Temperature} size="sm" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold text-primary tabular-nums">
                      {formatCurrency(deal.value)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: deal.stageColor ? `${deal.stageColor}18` : undefined,
                        color: deal.stageColor || undefined,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: deal.stageColor || "#94a3b8" }}
                      />
                      {deal.stageName}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[13px] text-foreground/60 tabular-nums">
                    {deal.probability}%
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-foreground/55">
                    {formatDate(deal.expectedClose)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DealForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
