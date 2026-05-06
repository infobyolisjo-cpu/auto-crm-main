import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { eq, asc, desc, gte } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { LeadsBySource } from "@/components/dashboard/LeadsBySource";
import { HotLeadsList } from "@/components/dashboard/HotLeadsList";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";

function getWeekAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function DashboardPage() {
  const weekAgo = getWeekAgo();

  const [allContacts, allDeals, stages, recentActivities, contactsWithActivities, newLeadsThisWeek] = await Promise.all([
    db.select().from(contacts),
    db.select().from(deals),
    db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)),
    db
      .select({
        id: activities.id,
        type: activities.type,
        description: activities.description,
        contactName: contacts.name,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .orderBy(desc(activities.createdAt))
      .limit(5),
    db.selectDistinct({ contactId: activities.contactId }).from(activities),
    db.select({ id: contacts.id }).from(contacts).where(gte(contacts.createdAt, weekAgo)),
  ]);

  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });

  const wonDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage?.isWon;
  });

  const contactedIds = new Set(contactsWithActivities.map((r) => r.contactId));
  const uncontactedLeads = allContacts.filter((c) => !contactedIds.has(c.id)).length;

  const sourceMap = new Map<string, number>();
  for (const c of allContacts) {
    sourceMap.set(c.source, (sourceMap.get(c.source) ?? 0) + 1);
  }
  const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

  const stats: DashboardStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue: activeDeals.reduce((sum, d) => sum + d.value, 0),
    wonDealsValue: wonDeals.reduce((sum, d) => sum + d.value, 0),
    conversionRate:
      allDeals.length > 0
        ? Math.round((wonDeals.length / allDeals.length) * 100)
        : 0,
    hotLeads: allContacts.filter((c) => c.temperature === "hot").length,
    newLeadsThisWeek: newLeadsThisWeek.length,
    uncontactedLeads,
    leadsBySource,
  };

  const pipelineData = stages
    .filter((s) => !s.isLost)
    .map((stage) => ({
      name: stage.name,
      count: allDeals.filter((d) => d.stageId === stage.id).length,
      value: allDeals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + d.value, 0),
      color: stage.color,
    }));

  const hotLeads = allContacts
    .filter((c) => c.temperature === "hot")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      interest: (c as { interest?: string | null }).interest ?? null,
      score: c.score,
      source: c.source,
    }));

  const isFirstRun = allContacts.length === 0 && allDeals.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de tu pipeline de ventas
        </p>
      </div>

      {isFirstRun && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Bienvenido a Auto-CRM
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tu CRM esta listo. Aqui tienes como comenzar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">1. Personaliza tu CRM</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejecuta <code className="bg-muted px-1 rounded">/setup</code> en Claude Code
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">2. Agrega contactos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ve a Contactos o usa <code className="bg-muted px-1 rounded">/add-lead</code>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">3. Conecta tus canales</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conecta tu formulario web o WhatsApp al endpoint POST /api/leads
              </p>
            </div>
          </div>
        </div>
      )}

      <NotificationBanner />

      <KPICards stats={stats} />

      {/* Row 1: Pipeline chart + Hot leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineChart data={pipelineData} />
        </div>
        <HotLeadsList leads={hotLeads} />
      </div>

      {/* Row 2: Recent activity + Leads by source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          activities={
            recentActivities as Array<{
              id: string;
              type: string;
              description: string;
              contactName: string | null;
              createdAt: Date;
            }>
          }
        />
        <LeadsBySource data={stats.leadsBySource} />
      </div>
    </div>
  );
}
