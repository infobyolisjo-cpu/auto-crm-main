import { db } from "@/db";
import { pipelineStages, deals, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PipelinePage() {
  const [stages, allDeals] = await Promise.all([
    db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)),
    db
      .select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        stageId: deals.stageId,
        contactId: deals.contactId,
        expectedClose: deals.expectedClose,
        probability: deals.probability,
        notes: deals.notes,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        contactName: contacts.name,
        contactTemperature: contacts.temperature,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id)),
  ]);

  const columns: PipelineColumn[] = stages.map((stage) => ({
    ...stage,
    deals: allDeals
      .filter((d) => d.stageId === stage.id)
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stageId: d.stageId,
        contactId: d.contactId,
        expectedClose: d.expectedClose,
        probability: d.probability,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        contactName: d.contactName,
        contactTemperature: d.contactTemperature,
      })) as PipelineColumn["deals"],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Arrastra y suelta deals entre etapas</p>
      </div>

      <KanbanBoard initialColumns={columns} />
    </div>
  );
}
