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
  meeting: "Reunión",
  note: "Nota",
  follow_up: "Follow-up",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const displayed = activities.slice(0, 6);

  return (
    <div className="rounded-lg bg-white shadow-card px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373] mb-4">
        Actividad Reciente
      </p>
      {displayed.length === 0 ? (
        <p className="text-sm text-[#a3a3a3] text-center py-6">Sin actividad reciente</p>
      ) : (
        <div className="space-y-0">
          {displayed.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline spine */}
              <div className="relative flex flex-col items-center">
                <div className="h-[7px] w-[7px] rounded-full bg-[#171717]/25 shrink-0 mt-[5px]" />
                {index < displayed.length - 1 && (
                  <div className="absolute left-[3px] top-3.5 bottom-0 w-px bg-[#e5e5e5]" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <p className="text-[10px] uppercase text-[#a3a3a3] font-medium tracking-wider leading-none mb-0.5">
                  {TYPE_LABELS[activity.type] ?? activity.type}
                </p>
                <p className="text-[13px] font-medium truncate leading-snug text-[#171717]">
                  {activity.contactName ?? activity.description}
                </p>
                {activity.contactName && (
                  <p className="text-[11px] text-[#737373] truncate">{activity.description}</p>
                )}
                <p className="text-[11px] text-[#a3a3a3] mt-0.5">
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
