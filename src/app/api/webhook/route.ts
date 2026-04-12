import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import type { LeadSource, Channel } from "@/types";

// ---------------------------------------------------------------------------
// Field name mapping — soporta español, inglés y variantes de formularios
// ---------------------------------------------------------------------------
const FIELD_MAP: Record<string, string> = {
  // Nombre
  name: "name", nombre: "name", full_name: "name",
  fullname: "name", first_name: "name", nombre_completo: "name",
  // Email
  email: "email", correo: "email", email_address: "email",
  correo_electronico: "email",
  // Teléfono
  phone: "phone", telefono: "phone", phone_number: "phone",
  cel: "phone", celular: "phone", whatsapp: "phone", movil: "phone",
  // Empresa
  company: "company", empresa: "company", company_name: "company",
  negocio: "company", organizacion: "company",
  // Notas / mensaje
  notes: "notes", notas: "notes", message: "notes",
  mensaje: "notes", comments: "notes", comentarios: "notes",
  descripcion: "notes",
  // Fuente (plataforma de origen)
  source: "source", fuente: "source", origen: "source",
  lead_source: "source", utm_source: "source",
  // Canal (cómo llegó el mensaje)
  channel: "channel", canal: "channel",
  utm_medium: "channel", medio: "channel",
  // Campaña
  campaign: "campaign", campana: "campaign",
  utm_campaign: "campaign", campana_marketing: "campaign",
};

const VALID_SOURCES: LeadSource[] = [
  "website", "whatsapp", "instagram", "linkedin",
  "referido", "redes_sociales", "llamada_fria", "email",
  "formulario", "evento", "import", "webhook", "otro",
];

const VALID_CHANNELS: Channel[] = [
  "web", "whatsapp", "instagram", "linkedin",
  "email", "phone", "in_person", "otro",
];

// ---------------------------------------------------------------------------
// Extrae campos del payload normalizando nombres (Typeform, Tally, custom, etc.)
// ---------------------------------------------------------------------------
function extractFields(payload: Record<string, unknown>): Record<string, string> {
  // Soporte para payloads anidados tipo { data: { ... } }
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const normalized = key.toLowerCase().trim().replace(/\s+/g, "_");
    const mapped = FIELD_MAP[normalized];
    if (mapped && !result[mapped]) {
      result[mapped] = String(value).trim();
    }
  }

  // Manejar first_name + last_name separados
  if (!result.name) {
    const first = data.first_name ?? data.firstName ?? data.primer_nombre ?? data.nombre;
    const last = data.last_name ?? data.lastName ?? data.apellido ?? data.apellidos;
    if (first) {
      result.name = [first, last].filter(Boolean).join(" ").trim();
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// POST /api/webhook
// Recibe leads de: byolisjo.com, WhatsApp, Instagram, LinkedIn, Zapier, Tally, Typeform
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── Auth: WEBHOOK_SECRET de variable de entorno ──────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get("x-webhook-secret");
    if (!headerSecret || headerSecret !== secret) {
      console.warn("[webhook] Auth fallida — secret incorrecto o faltante", {
        ip: request.headers.get("x-forwarded-for") ?? "unknown",
        ua: request.headers.get("user-agent")?.slice(0, 80),
      });
      return NextResponse.json(
        { error: "Unauthorized — header x-webhook-secret inválido o faltante" },
        { status: 401 }
      );
    }
  }

  // ── Parsear payload ───────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    console.error("[webhook] Payload JSON inválido");
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // ── Extraer y validar campos ──────────────────────────────────────────────
  const fields = extractFields(payload);

  if (!fields.name) {
    console.warn("[webhook] Payload sin campo 'name'", { keys: Object.keys(payload) });
    return NextResponse.json(
      {
        error: "El campo 'name' (o 'nombre') es requerido",
        received_keys: Object.keys(payload),
        supported_fields:
          "name, email, phone, company, notes, source, channel, campaign, utm_source, utm_medium, utm_campaign",
      },
      { status: 400 }
    );
  }

  // Normalizar source y channel a valores válidos
  const rawSource = (fields.source ?? "").toLowerCase() as LeadSource;
  const source: LeadSource = VALID_SOURCES.includes(rawSource) ? rawSource : "webhook";

  const rawChannel = (fields.channel ?? "").toLowerCase() as Channel;
  const channel: Channel | null = VALID_CHANNELS.includes(rawChannel) ? rawChannel : null;

  // ── Insertar lead en la base de datos ────────────────────────────────────
  try {
    const [contact] = await db
      .insert(contacts)
      .values({
        name: fields.name,
        email: fields.email || null,
        phone: fields.phone || null,
        company: fields.company || null,
        source,
        channel,
        campaign: fields.campaign || null,
        temperature: "cold",
        score: 0,
        notes: fields.notes || null,
      })
      .returning();

    // Actividad automática de trazabilidad
    const sourceLabel = source !== "webhook" ? ` via ${source}` : " via webhook";
    const campaignLabel = fields.campaign ? ` [${fields.campaign}]` : "";
    const companyLabel = fields.company ? ` (${fields.company})` : "";

    await db.insert(activities).values({
      type: "note",
      description: `Lead recibido${sourceLabel}${campaignLabel}${companyLabel}`,
      contactId: contact.id,
    });

    const ms = Date.now() - startTime;
    console.log("[webhook] Lead creado", {
      id: contact.id,
      name: contact.name,
      source,
      channel,
      campaign: fields.campaign ?? null,
      ms,
    });

    return NextResponse.json(
      {
        success: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          source: contact.source,
          channel: contact.channel,
          campaign: contact.campaign,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook] Error al guardar lead", { name: fields.name, error: msg });
    return NextResponse.json(
      { error: `Error al crear contacto: ${msg}` },
      { status: 500 }
    );
  }
}
