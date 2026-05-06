import { cn } from "@/lib/utils";
import type { Temperature } from "@/types";

interface ContactAvatarProps {
  name: string;
  temperature?: Temperature;
  size?: "sm" | "md";
  className?: string;
}

const TEMP_RING: Record<Temperature, string> = {
  hot:  "ring-red-400/60",
  warm: "ring-orange-400/60",
  cold: "ring-slate-300/60",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hue(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  const hues = [215, 160, 280, 340, 25, 195, 130];
  return `hsl(${hues[h % hues.length]}, 65%, 52%)`;
}

export function ContactAvatar({ name, temperature, size = "md", className }: ContactAvatarProps) {
  const dim = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";
  const ring = temperature ? `ring-2 ${TEMP_RING[temperature]}` : "";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        dim,
        ring,
        className
      )}
      style={{ backgroundColor: hue(name) }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
