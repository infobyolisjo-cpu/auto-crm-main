"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DealCard } from "./DealCard";
import { formatCurrency } from "@/lib/constants";

interface Deal {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
}

interface KanbanColumnProps {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

export function KanbanColumn({ id, name, color, deals }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] rounded-xl bg-muted/40 border border-border transition-colors duration-150 ${
        isOver ? "bg-muted/70 border-primary/30" : ""
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2.5">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-[13px] font-semibold flex-1 truncate">{name}</span>
        <span className="text-[11px] text-muted-foreground bg-background rounded-md px-1.5 py-0.5 border border-border tabular-nums">
          {deals.length}
        </span>
      </div>

      {/* Total value */}
      {totalValue > 0 && (
        <div className="px-3 pb-2 text-[11px] text-muted-foreground font-medium">
          {formatCurrency(totalValue)}
        </div>
      )}

      <div className="w-full border-t border-border/60" />

      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-1.5 min-h-[80px] overflow-y-auto">
          {deals.map((deal) => (
            <DealCard key={deal.id} {...deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
