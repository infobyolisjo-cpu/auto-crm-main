"use client";

import { useState, useEffect } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { Button } from "@/components/ui/button";
import {
  Phone, Mail, Users, FileText, Clock,
  AlertCircle, CheckCircle2, Plus, Activity,
} from "lucide-react";
import { formatRelativeDate, formatDate, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import type { ActivityType } from "@/types";
import { apiFetch } from "@/lib/api-fetch";

const TYPE_CONFIG: Record<string, { icon: typeof Phone; color: string }> = {
  call:      { icon: Phone,    color: "#3b82f6" },
  email:     { icon: Mail,     color: "#8b5cf6" },
  meeting:   { icon: Users,    color: "#10b981" },
  note:      { icon: FileText, color: "#94a3b8" },
  follow_up: { icon: Clock,    color: "#f97316" },
};

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  contactName: string | null;
  contactId: string;
  scheduledAt: number | Date | null;
  completedAt: number | Date | null;
  createdAt: number | Date;
}

interface FollowUps {
  overdue: ActivityItem[];
  today: ActivityItem[];
  upcoming: ActivityItem[];
  unscheduled: ActivityItem[];
}

export default function ActivitiesPage() {
  const [allActivities, setActivities] = useState<ActivityItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUps | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    Promise.all([
      apiFetch("/api/activities").then((r) => r.json()),
      apiFetch("/api/followups").then((r) => r.json()),
    ]).then(([acts, fups]) => {
      setActivities(acts);
      setFollowUps(fups);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Historial de interacciones y seguimientos</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Registrar
        </Button>
      </div>

      <ActivityForm open={showForm} onClose={() => { setShowForm(false); loadData(); }} />

      {/* Follow-up alerts */}
      {followUps && (followUps.overdue.length > 0 || followUps.today.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {followUps.overdue.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-[12px] font-semibold text-red-700 uppercase tracking-wider">
                  Vencidos ({followUps.overdue.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {followUps.overdue.map((f) => (
                  <div key={f.id} className="text-[13px]">
                    <p className="font-medium text-red-900 leading-tight">{f.description}</p>
                    <p className="text-[11px] text-red-600">{f.contactName} · {formatDate(f.scheduledAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {followUps.today.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-[12px] font-semibold text-orange-700 uppercase tracking-wider">
                  Hoy ({followUps.today.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {followUps.today.map((f) => (
                  <div key={f.id} className="text-[13px]">
                    <p className="font-medium text-orange-900 leading-tight">{f.description}</p>
                    <p className="text-[11px] text-orange-600">{f.contactName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-4">
          Todas las actividades
        </p>
        {allActivities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sin actividades"
            description="Las actividades aparecen cuando registras llamadas, emails, reuniones o notas."
          />
        ) : (
          <div className="relative">
            <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {allActivities.map((activity) => {
                const cfg = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.note;
                const Icon = cfg.icon;
                const typeLabel = ACTIVITY_TYPE_CONFIG[activity.type as ActivityType]?.label || activity.type;
                return (
                  <div key={activity.id} className="flex gap-3 items-start relative">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shrink-0 z-10"
                      style={{ color: cfg.color }}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          {typeLabel}
                        </span>
                        {activity.contactName && (
                          <span className="text-[11px] text-muted-foreground">{activity.contactName}</span>
                        )}
                        {activity.completedAt && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-[13px] text-foreground leading-snug">{activity.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeDate(activity.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
