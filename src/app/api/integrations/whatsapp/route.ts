import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeLead, ingestLead } from "@/lib/lead-intake";
import type { LeadInput } from "@/lib/lead-intake";

/**
 * POST /api/integrations/whatsapp
 *
 * Primary intake: WhatsApp Agent Kit
 * Optional transport: Evolution API (only used if EVOLUTION_API_URL + EVOLUTION_API_KEY are set)
 *
 * Authentication (optional):
 *   Set WHATSAPP_WEBHOOK_SECRET env var and send it as x-webhook-secret or x-agent-kit-secret header.
 *   If not set, the endpoint is open (protect at the network/Vercel level instead).
 *
 * Payload fields (phone or name is required):
 *
 *   Core contact:
 *     name / nombre               Contact full name
 *     phone / telefono            WhatsApp number with country code (e.g. 521234567890)
 *     email                       Optional email address
 *     company / empresa           Optional company name
 *
 *   Lead context:
 *     message / mensaje           Raw message text or last message in conversation
 *     interest / interes          What they are interested in (product/service)
 *     conversation_summary        AI summary from Agent Kit (appended to notes — recommended)
 *     resumen                     Same as conversation_summary (Spanish alias)
 *
 *   Tracking:
 *     source                      Defaults to "whatsapp_agent_kit"
 *     campaign / campana          UTM campaign or campaign name
 *     session_id                  Agent Kit session / conversation ID (stored in metadata)
 *     instance                    Evolution API instance name (stored in metadata)
 *     tags                        Array of string tags
 *
 * Response:
 *   201  { success, action: "created", contact, deal, transport }
 *   200  { success, action: "updated", contact, deal, transport }
 *   400  Invalid JSON or payload
 *   401  Wrong webhook secret
 *   422  No identifiable lead data (no name or phone)
 */

const WhatsAppAgentKitSchema = z.object({
  // Core contact fields (bilingual)
  name: z.string().max(200).optional(),
  nombre: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  correo: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  telefono: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  empresa: z.string().max(200).optional(),

  // Lead context
  message: z.string().max(5000).optional(),
  mensaje: z.string().max(5000).optional(),
  interest: z.string().max(500).optional(),
  interes: z.string().max(500).optional(),
  conversation_summary: z.string().max(5000).optional(),
  resumen: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  notas: z.string().max(5000).optional(),

  // Routing / tracking
  source: z.string().max(50).optional(),
  fuente: z.string().max(50).optional(),
  channel: z.string().max(50).optional(),
  canal: z.string().max(50).optional(),
  campaign: z.string().max(200).optional(),
  campana: z.string().max(200).optional(),

  // Agent Kit / Evolution metadata
  session_id: z.string().max(200).optional(),
  instance: z.string().max(200).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

export async function POST(request: NextRequest) {
  // Optional authentication
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided =
      request.headers.get("x-webhook-secret") ??
      request.headers.get("x-agent-kit-secret");
    if (provided !== webhookSecret) {
      return NextResponse.json(
        {
          error: "No autorizado",
          hint: "Envía WHATSAPP_WEBHOOK_SECRET en el header x-webhook-secret",
        },
        { status: 401 }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = WhatsAppAgentKitSchema.safeParse(
    typeof body === "object" && body !== null ? body : {}
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Require at least name or phone to identify the lead
  const hasIdentifier =
    (data.name ?? data.nombre ?? "").trim().length > 0 ||
    (data.phone ?? data.telefono ?? "").trim().length > 0;

  if (!hasIdentifier) {
    return NextResponse.json(
      {
        error: "Se requiere al menos nombre o teléfono",
        hint: "Incluye los campos name (o nombre) y/o phone (o telefono)",
        example: {
          name: "María García",
          phone: "521234567890",
          conversation_summary: "Interesada en automatización de ventas, pidió cotización",
        },
      },
      { status: 422 }
    );
  }

  // Merge message + conversation_summary + notes into a single notes string
  const messagePart = (data.message ?? data.mensaje ?? "").trim();
  const summaryPart = (data.conversation_summary ?? data.resumen ?? "").trim();
  const notesPart = (data.notes ?? data.notas ?? "").trim();

  const noteLines: string[] = [];
  if (messagePart) noteLines.push(messagePart);
  if (summaryPart) noteLines.push(`Resumen de conversación:\n${summaryPart}`);
  if (notesPart) noteLines.push(notesPart);
  const mergedNotes = noteLines.join("\n\n") || undefined;

  // Build metadata from Agent Kit tracking fields
  const metadata: Record<string, unknown> = {};
  if (data.session_id) metadata.session_id = data.session_id;
  if (data.instance) metadata.evolution_instance = data.instance;
  if (data.tags?.length) metadata.tags = data.tags;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const leadInput = {
    name: data.name ?? data.nombre,
    email: data.email ?? data.correo,
    phone: data.phone ?? data.telefono,
    company: data.company ?? data.empresa,
    notes: mergedNotes,
    source: data.source ?? data.fuente ?? "whatsapp_agent_kit",
    channel: data.channel ?? data.canal ?? "whatsapp",
    campaign: data.campaign ?? data.campana,
    interest: data.interest ?? data.interes,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  } as LeadInput;

  const normalized = normalizeLead(leadInput);
  const result = await ingestLead(normalized);

  const evolutionConfigured = !!(
    process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY
  );

  return NextResponse.json(
    {
      success: true,
      action: result.action,
      contact: {
        id: result.contact.id,
        name: result.contact.name,
        phone: result.contact.phone,
        source: result.contact.source,
        temperature: result.contact.temperature,
        score: result.contact.score,
      },
      deal: result.deal
        ? { id: result.deal.id, title: result.deal.title }
        : null,
      transport: evolutionConfigured ? "evolution_api" : "direct",
    },
    { status: result.action === "created" ? 201 : 200 }
  );
}
