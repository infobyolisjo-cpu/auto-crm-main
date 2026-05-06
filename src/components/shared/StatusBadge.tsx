"use client";

import type { Temperature } from "@/types";

interface StatusBadgeProps {
  temperature: Temperature;
  size?: "sm" | "md";
}

const TEMP: Record<Temperature, { dot: string; label: string; bg: string; text: string }> = {
  hot:  { dot: "#ef4444", label: "Caliente", bg: "#fef2f2", text: "#b91c1c" },
  warm: { dot: "#f97316", label: "Tibio",    bg: "#fff7ed", text: "#c2410c" },
  cold: { dot: "#94a3b8", label: "Frío",     bg: "#f8fafc", text: "#64748b" },
};

export function StatusBadge({ temperature, size = "md" }: StatusBadgeProps) {
  const t = TEMP[temperature];
  const isSmall = size === "sm";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        fontSize: isSmall ? "11px" : "12px",
        padding: isSmall ? "2px 7px" : "3px 9px",
        backgroundColor: t.bg,
        color: t.text,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          backgroundColor: t.dot,
        }}
      />
      {t.label}
    </span>
  );
}
