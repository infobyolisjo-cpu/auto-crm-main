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
    <aside className="hidden md:flex md:w-52 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen border-r border-[var(--sidebar-border)]">
      {/* Brand */}
      <div className="flex h-12 items-center gap-2.5 px-4 border-b border-[var(--sidebar-border)]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--sidebar-primary)]">
          <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-[var(--sidebar-foreground)]">Auto-CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2.5 space-y-px">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-100",
                isActive
                  ? "bg-[var(--sidebar-primary)]/15 text-[var(--sidebar-primary)] [&_svg]:text-[var(--sidebar-primary)]"
                  : "text-[var(--sidebar-foreground)]/50 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]/90"
              )}
            >
              <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={isActive ? 2 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <p className="text-[11px] text-[var(--sidebar-foreground)]/25 font-medium tracking-wide">
          ByOlisJo · v1.0
        </p>
      </div>
    </aside>
  );
}
