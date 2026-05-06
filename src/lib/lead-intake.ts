/**
 * lead-intake.ts
 * Shared business logic for lead ingestion.
 * Used by /api/leads and /api/leads/email endpoints.
 */

import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import type { Temperature, LeadSource, Channel, LeadStatus } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VALID_SOURCES: LeadSource[] = [
  "website",
  "whatsapp",
  "whatsapp_agent_kit",
  "instagram",
  "linkedin",
  "referido",
  "redes_sociales",
  "llamada_fria",
  "email",
  "formulario",
  "formulario_web",
  "evento",
  "import",
  "webhook",
  "manual",
  "otro",
];

export const VALID_CHANNELS: Channel[] = [
  "web",
  "whatsapp",
  "instagram",
  "linkedin",
  "email",
  "phone",
  "in_person",
  "otro",
];

// ---------------------------------------------------------------------------
// Zod validation schema
// ---------------------------------------------------------------------------

export const LeadInputSchema = z.object({
  // name / nombre
  nombre: z.string().max(200).optional(),
  name: z.string().max(200).optional(),

  // email / correo
  email: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() === "" ? undefined : v)),
  correo: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() === "" ? undefined : v)),

  // phone / telefono
  telefono: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),

  // message / mensaje
  mensaje: z.string().max(5000).optional(),
  message: z.string().max(5000).optional(),

  // notes / notas
  notas: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),

  // source / fuente
  fuente: z.string().max(50).optional(),
  source: z.string().max(50).optional(),

  // interest / interes
  interes: z.string().max(500).optional(),
  interest: z.string().max(500).optional(),

  // status / estado
  status: z
    .enum(["new", "contacted", "qualified", "unqualified", "lost"])
    .optional()
    .default("new"),
  estado: z
    .enum(["new", "contacted", "qualified", "unqualified", "lost"])
    .optional(),

  // channel / canal
  canal: z.string().max(50).optional(),
  channel: z.string().max(50).optional(),

  // campaign / campana
  campana: z.string().max(200).optional(),
  campaign: z.string().max(200).optional(),

  // metadata
  metadata: z.record(z.string(), z.unknown()).optional(),

  // company / empresa
  empresa: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

// ---------------------------------------------------------------------------
// NormalizedLead interface
// ---------------------------------------------------------------------------

export interface NormalizedLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: LeadSource;
  channel: Channel | null;
  campaign: string | null;
  interest: string | null;
  status: LeadStatus;
  metadata: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// IntakeResult interface
// ---------------------------------------------------------------------------

export interface IntakeResult {
  contact: typeof contacts.$inferSelect;
  action: "created" | "updated";
  isIncomplete: boolean;
  deal: typeof deals.$inferSelect | null;
}

// ---------------------------------------------------------------------------
// normalizeLead
// ---------------------------------------------------------------------------

export function normalizeLead(input: LeadInput): NormalizedLead {
  // name
  const rawName = input.name ?? input.nombre ?? null;
  const name = rawName?.trim() || null;

  // email — prefer `email`, fall back to `correo`
  const rawEmail = input.email ?? input.correo ?? null;
  const email = rawEmail ? rawEmail.toLowerCase().trim() || null : null;

  // phone — strip spaces, dashes, dots, parens; keep digits and leading +
  const rawPhone = input.phone ?? input.telefono ?? null;
  let phone: string | null = null;
  if (rawPhone) {
    const cleaned = rawPhone.replace(/[\s\-.() ]/g, "");
    // Keep digits and a leading +
    const normalized = cleaned.replace(/[^\d+]/g, "");
    phone = normalized.length >= 6 ? normalized : null;
  }

  // company
  const rawCompany = input.company ?? input.empresa ?? null;
  const company = rawCompany?.trim() || null;

  // notes — merge mensaje/message and notas/notes
  const messagePart = (input.mensaje ?? input.message ?? "").trim();
  const notesPart = (input.notas ?? input.notes ?? "").trim();
  const mergedNotes = [messagePart, notesPart].filter(Boolean).join("\n\n") || null;

  // source
  const rawSource = (input.source ?? input.fuente ?? "otro").toLowerCase().trim();
  const source: LeadSource = (VALID_SOURCES as string[]).includes(rawSource)
    ? (rawSource as LeadSource)
    : "otro";

  // channel
  const rawChannel = (input.channel ?? input.canal ?? "").toLowerCase().trim();
  const channel: Channel | null = (VALID_CHANNELS as string[]).includes(rawChannel)
    ? (rawChannel as Channel)
    : null;

  // campaign
  const rawCampaign = input.campaign ?? input.campana ?? null;
  const campaign = rawCampaign?.trim() || null;

  // interest
  const rawInterest = input.interest ?? input.interes ?? null;
  const interest = rawInterest?.trim() || null;

  // status — prefer `estado` over `status`
  const status: LeadStatus = (input.estado ?? input.status ?? "new") as LeadStatus;

  // metadata
  const metadata = input.metadata ?? null;

  return { name, email, phone, company, notes: mergedNotes, source, channel, campaign, interest, status, metadata };
}

// ---------------------------------------------------------------------------
// findExistingContact
// ---------------------------------------------------------------------------

export async function findExistingContact(
  email: string | null,
  phone: string | null
): Promise<typeof contacts.$inferSelect | null> {
  if (!email && !phone) return null;

  if (email && phone) {
    const results = await db
      .select()
      .from(contacts)
      .where(or(eq(contacts.email, email), eq(contacts.phone, phone)))
      .limit(1);
    return results[0] ?? null;
  }

  if (email) {
    const results = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email))
      .limit(1);
    return results[0] ?? null;
  }

  // phone only
  const results = await db
    .select()
    .from(contacts)
    .where(eq(contacts.phone, phone!))
    .limit(1);
  return results[0] ?? null;
}

// ---------------------------------------------------------------------------
// scoreByKeywords
// ---------------------------------------------------------------------------

const HOT_KEYWORDS = [
  "precio",
  "presupuesto",
  "cuánto",
  "cuanto",
  "cobras",
  "cuestan",
  "tarifa",
  "cotización",
  "cotizacion",
  "costo",
  "contratar",
  "urgente",
  "para hoy",
  "para mañana",
  "para manana",
  "inmediato",
  "pagar",
];

const WARM_KEYWORDS = [
  "ia",
  "inteligencia artificial",
  "automatización",
  "automatizacion",
  "auditoría",
  "auditoria",
  "página web",
  "pagina web",
  "whatsapp",
  "crm",
  "agenda",
  "consulta",
  "me interesa",
  "necesito",
  "esta semana",
  "pronto",
  "landing",
  "funnel",
  "embudo",
];

export function scoreByKeywords(text: string): { boost: number; suggestedTemperature: Temperature } {
  const padded = ` ${text.toLowerCase()} `;

  for (const kw of HOT_KEYWORDS) {
    if (padded.includes(` ${kw} `) || padded.includes(` ${kw},`) || padded.includes(` ${kw}.`) || padded.includes(` ${kw}?`) || padded.includes(` ${kw}!`)) {
      return { boost: 30, suggestedTemperature: "hot" };
    }
    // For multi-word phrases, check substring in padded string
    if (kw.includes(" ") && padded.includes(kw)) {
      return { boost: 30, suggestedTemperature: "hot" };
    }
  }

  for (const kw of WARM_KEYWORDS) {
    if (padded.includes(` ${kw} `) || padded.includes(` ${kw},`) || padded.includes(` ${kw}.`) || padded.includes(` ${kw}?`) || padded.includes(` ${kw}!`)) {
      return { boost: 15, suggestedTemperature: "warm" };
    }
    if (kw.includes(" ") && padded.includes(kw)) {
      return { boost: 15, suggestedTemperature: "warm" };
    }
  }

  return { boost: 0, suggestedTemperature: "cold" };
}

// ---------------------------------------------------------------------------
// ingestLead
// ---------------------------------------------------------------------------

export async function ingestLead(normalized: NormalizedLead): Promise<IntakeResult> {
  const { name, email, phone, company, notes, source, channel, campaign, interest, status, metadata } = normalized;

  // Determine isIncomplete
  const isIncomplete = !name || (!email && !phone);

  // Score calculation
  const textToScore = [notes, interest].filter(Boolean).join(" ");
  const { boost, suggestedTemperature } = scoreByKeywords(textToScore);
  const baseScoreMap: Record<Temperature, number> = { hot: 40, warm: 25, cold: 10 };
  const baseScore = baseScoreMap[suggestedTemperature];
  const finalScore = Math.min(100, baseScore + boost);
  const temperature = suggestedTemperature;

  // Duplicate detection
  const existing = await findExistingContact(email, phone);

  if (existing) {
    // --- UPDATE existing contact ---
    const dateStr = new Date().toISOString().split("T")[0];
    const appendNote = `\n\n[${dateStr}] Nueva consulta via ${source}: ${notes ?? "contacto repetido"}`;
    const updatedNotes = (existing.notes ?? "") + appendNote;

    // Only fill in null fields — never downgrade temperature or score
    const tempOrder: Record<Temperature, number> = { cold: 0, warm: 1, hot: 2 };
    const existingTemp = (existing.temperature as Temperature) ?? "cold";
    const newTemp: Temperature =
      tempOrder[temperature] > tempOrder[existingTemp] ? temperature : existingTemp;
    const newScore = Math.max(existing.score, finalScore);

    const updateValues: Partial<typeof contacts.$inferInsert> = {
      notes: updatedNotes,
      temperature: newTemp,
      score: newScore,
      updatedAt: new Date(),
    };
    if (!existing.name && name) updateValues.name = name;
    if (!existing.email && email) updateValues.email = email;
    if (!existing.phone && phone) updateValues.phone = phone;
    if (!existing.company && company) updateValues.company = company;
    if (!existing.interest && interest) updateValues.interest = interest;

    const [updatedContact] = await db
      .update(contacts)
      .set(updateValues)
      .where(eq(contacts.id, existing.id))
      .returning();

    // Insert activity
    const activityDesc = [
      `Lead repetido via ${source}${campaign ? ` [${campaign}]` : ""}.`,
      notes ? `Mensaje: ${notes.slice(0, 200)}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    await db.insert(activities).values({
      type: "note",
      description: activityDesc,
      contactId: existing.id,
    });

    return { contact: updatedContact, action: "updated", isIncomplete, deal: null };
  }

  // --- CREATE new contact ---
  const missingFields: string[] = [];
  if (!name) missingFields.push("nombre");
  if (!email) missingFields.push("email");
  if (!phone) missingFields.push("teléfono");

  let autoNote = notes ?? null;
  if (isIncomplete && missingFields.length > 0) {
    const incompleteNotice = `⚠️ Lead incompleto — faltan: ${missingFields.join(", ")}`;
    autoNote = autoNote ? `${autoNote}\n\n${incompleteNotice}` : incompleteNotice;
  }

  const [newContact] = await db
    .insert(contacts)
    .values({
      name: name ?? "Sin nombre",
      email: email ?? null,
      phone: phone ?? null,
      company: company ?? null,
      source,
      channel: channel ?? null,
      campaign: campaign ?? null,
      temperature,
      score: finalScore,
      notes: autoNote,
      status,
      interest: interest ?? null,
      metadata: metadata ?? null,
      isIncomplete,
    })
    .returning();

  // Build activity description
  const activityLines: string[] = [
    `Lead recibido via ${source}${campaign ? ` [${campaign}]` : ""}${company ? ` (${company})` : ""}`,
  ];
  if (interest) activityLines.push(`Interés: ${interest}`);
  if (isIncomplete) activityLines.push(`⚠️ Lead incompleto — faltan: ${missingFields.join(", ")}`);

  await db.insert(activities).values({
    type: "note",
    description: activityLines.join("\n"),
    contactId: newContact.id,
  });

  // Find first usable pipeline stage
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.isWon, false))
    .orderBy(pipelineStages.order);

  const firstStage = stages.find((s) => !s.isLost) ?? null;

  let newDeal: typeof deals.$inferSelect | null = null;
  if (firstStage) {
    const probMap: Record<Temperature, number> = { hot: 30, warm: 20, cold: 10 };
    const [insertedDeal] = await db
      .insert(deals)
      .values({
        title: `Oportunidad con ${newContact.name}`,
        value: 0,
        stageId: firstStage.id,
        contactId: newContact.id,
        probability: probMap[temperature],
      })
      .returning();
    newDeal = insertedDeal;
  }

  return { contact: newContact, action: "created", isIncomplete, deal: newDeal };
}
