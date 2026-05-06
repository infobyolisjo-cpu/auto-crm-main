"use client";

import { formatCurrency } from "@/lib/constants";

interface StageData {
  name: string;
  count: number;
  value: number;
  color: string;
}

export function PipelineChart({ data }: { data: StageData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Pipeline de Ventas
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay deals en el pipeline</p>
      ) : (
        <div className="space-y-3">
          {data.map((stage) => {
            const pct = Math.round((stage.count / maxCount) * 100);
            return (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-medium truncate max-w-[55%]">{stage.name}</span>
                  <span className="text-[12px] text-muted-foreground tabular-nums shrink-0 ml-2">
                    {stage.count} deal{stage.count !== 1 ? "s" : ""}
                    {stage.value > 0 && (
                      <span className="ml-1.5 font-medium text-foreground">· {formatCurrency(stage.value)}</span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
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
