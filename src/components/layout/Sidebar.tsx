"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Activity,
  Settings,
  Briefcase,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/activities", label: "Actividades", icon: Activity },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen border-r border-[var(--sidebar-border)]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-[var(--sidebar-border)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sidebar-primary)]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Auto-CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                isActive
                  ? "bg-[var(--sidebar-accent)] text-white"
                  : "text-[var(--sidebar-foreground)]/60 hover:bg-[var(--sidebar-accent)]/60 hover:text-[var(--sidebar-foreground)]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)]">
        <p className="text-[11px] text-[var(--sidebar-foreground)]/30 tracking-wide">
          ByOlisJo · v1.0
        </p>
      </div>
    </aside>
  );
}
