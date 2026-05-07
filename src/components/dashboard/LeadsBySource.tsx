"use client";

import { SOURCE_LABELS } from "@/lib/constants";
import type { LeadSource } from "@/types";

interface LeadsBySourceProps {
  data: Array<{ source: string; count: number }>;
}

export function LeadsBySource({ data }: LeadsBySourceProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 6);
  const max = sorted[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-4">
        Leads por Fuente
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin datos de origen</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ source, count }) => {
            const label = SOURCE_LABELS[source as LeadSource] ?? source;
            const pct = max > 0 ? Math.round((count / max) * 100) : 0;
            return (
              <div key={source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium truncate">{label}</span>
                  <span className="text-[11px] tabular-nums text-foreground/55 font-medium shrink-0 ml-2">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
