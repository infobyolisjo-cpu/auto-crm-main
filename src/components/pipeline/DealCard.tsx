"use client";

import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Temperature } from "@/types";

interface DealCardProps {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
}

export function DealCard({ id, title, value: initialValue, contactName, contactTemperature, probability }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const startEdit = (e: React.PointerEvent) => {
    e.stopPropagation();
    setInputValue(String(Math.round(value / 100)));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const saveEdit = async () => {
    setEditing(false);
    const parsed = parseFloat(inputValue.replace(/[^0-9.]/g, ""));
    const newCents = isNaN(parsed) ? value : Math.round(parsed * 100);
    if (newCents === value) return;
    const prev = value;
    setValue(newCents);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newCents }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setValue(prev);
      toast.error("No se pudo guardar el valor");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-lg bg-card border border-border px-3 py-2.5 hover:shadow-sm transition-shadow duration-150 select-none"
    >
      {/* Drag handle + title */}
      <div {...listeners} className="flex items-start gap-1.5 cursor-grab active:cursor-grabbing mb-2">
        <GripVertical className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
        <p className="text-[13px] font-medium leading-snug flex-1">{title}</p>
      </div>

      {/* Value + status */}
      <div className="flex items-center justify-between pl-5">
        {editing ? (
          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <span className="text-[11px] text-muted-foreground">$</span>
            <input
              ref={inputRef}
              type="number"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="w-20 text-[13px] font-semibold border-b border-primary bg-transparent focus:outline-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={startEdit}
            className="text-[13px] font-semibold text-primary hover:underline cursor-text"
            title="Editar valor"
          >
            {formatCurrency(value)}
          </button>
        )}
        {contactTemperature && (
          <StatusBadge temperature={contactTemperature as Temperature} size="sm" />
        )}
      </div>

      {/* Contact + probability */}
      <div className="flex items-center justify-between pl-5 mt-1.5 text-[11px] text-muted-foreground">
        <span className="truncate max-w-[70%]">{contactName || "Sin contacto"}</span>
        <span className="tabular-nums">{probability}%</span>
      </div>
    </div>
  );
}
