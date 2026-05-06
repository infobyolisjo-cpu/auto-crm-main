"use client";

import { formatRelativeDate } from "@/lib/constants";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  contactName: string | null;
  createdAt: number | Date;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  email: "Email",
  meeting: "Reunion",
  note: "Nota",
  follow_up: "Follow-up",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const displayed = activities.slice(0, 6);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Actividad Reciente
      </p>
      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin actividad reciente</p>
      ) : (
        <div className="space-y-0">
          {displayed.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline spine */}
              <div className="relative flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                {index < displayed.length - 1 && (
                  <div className="absolute left-[3px] top-4 bottom-0 w-px bg-border" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <p className="text-[11px] uppercase text-muted-foreground/60 font-medium leading-none mb-0.5">
                  {TYPE_LABELS[activity.type] ?? activity.type}
                </p>
                <p className="text-[13px] font-medium truncate leading-snug">
                  {activity.contactName ?? activity.description}
                </p>
                {activity.contactName && (
                  <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatRelativeDate(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
