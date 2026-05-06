"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOURCE_LABELS } from "@/lib/constants";
import type { LeadSource } from "@/types";

interface LeadsBySourceProps {
  data: Array<{ source: string; count: number }>;
}

export function LeadsBySource({ data }: LeadsBySourceProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 6);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Leads por Fuente</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos aún</p>
        ) : (
          <div className="space-y-3">
            {sorted.map(({ source, count }) => {
              const label =
                SOURCE_LABELS[source as LeadSource] || source;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
