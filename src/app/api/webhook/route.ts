import { NextRequest } from "next/server";
import {
  LeadInputSchema,
  normalizeLead,
  ingestLead,
} from "@/lib/lead-intake";
import { noStoreJson, verifySharedSecret } from "@/lib/security";

// Field name mapping for Typeform / Tally / custom webhook payloads
const FIELD_MAP: Record<string, string> = {
  // name
  name: "name", nombre: "name", full_name: "name",
  fullname: "name", first_name: "name", nombre_completo: "name",
  // email
  email: "email", correo: "email", email_address: "email",
  correo_electronico: "email",
  // phone
  phone: "phone", telefono: "phone", phone_number: "phone",
  cel: "phone", celular: "phone", whatsapp: "phone", movil: "phone",
  // company
  company: "company", empresa: "company", company_name: "company",
  negocio: "company", organizacion: "company",
  // notes / message
  notes: "notes", notas: "notes", message: "notes",
  mensaje: "notes", comments: "notes", comentarios: "notes",
  descripcion: "notes",
  // source
  source: "source", fuente: "source", origen: "source",
  lead_source: "source", utm_source: "source",
  // channel
  channel: "channel", canal: "channel",
  utm_medium: "channel", medio: "channel",
  // campaign
  campaign: "campaign", campana: "campaign",
  utm_campaign: "campaign",
  // interest
  interest: "interest", interes: "interest",
};

function extractFields(payload: Record<string, unknown>): Record<string, unknown> {
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const normalized = key.toLowerCase().trim().replace(/\s+/g, "_");
    const mapped = FIELD_MAP[normalized];
    if (mapped && result[mapped] === undefined) {
      result[mapped] = String(value).trim();
    }
  }

  // Handle first_name + last_name separately
  if (!result.name) {
    const first = data.first_name ?? data.firstName ?? data.primer_nombre ?? data.nombre;
    const last = data.last_name ?? data.lastName ?? data.apellido ?? data.apellidos;
    if (first) {
      result.name = [first, last].filter(Boolean).join(" ").trim();
    }
  }

  // Pass metadata through
  if (payload.metadata && typeof payload.metadata === "object") {
    result.metadata = payload.metadata;
  }

  return result;
}

export async function POST(request: NextRequest) {
  const auth = verifySharedSecret(request, {
    envNames: ["OUTREACH_SECRET", "WEBHOOK_SECRET"],
    headerNames: ["x-outreach-secret", "x-webhook-secret"],
  });

  if (!auth.ok) {
    return noStoreJson(
      {
        error: auth.error,
        hint: "Envia x-outreach-secret. x-webhook-secret se acepta temporalmente para compatibilidad.",
      },
      { status: auth.status }
    );
  }

  // Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  // Extract and map field names
  const raw = extractFields(payload);

  // Require at least a name
  if (!raw.name) {
    return noStoreJson(
      {
        error: "El campo 'name' (o 'nombre') es requerido",
        received_keys: Object.keys(payload),
        supported_fields: Object.keys(FIELD_MAP).join(", "),
      },
      { status: 400 }
    );
  }

  // Default source to "webhook" if not provided or unrecognized
  if (!raw.source) raw.source = "webhook";

  // Validate + normalize via shared schema
  const parsed = LeadInputSchema.safeParse(raw);
  if (!parsed.success) {
    return noStoreJson(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalized = normalizeLead(parsed.data);

  try {
    const result = await ingestLead(normalized);

    return noStoreJson(
      {
        success: true,
        action: result.action,
        contact: {
          id: result.contact.id,
          name: result.contact.name,
          email: result.contact.email,
          phone: result.contact.phone,
          source: result.contact.source,
          temperature: result.contact.temperature,
          score: result.contact.score,
        },
        deal: result.deal ? { id: result.deal.id, title: result.deal.title } : null,
        isIncomplete: result.isIncomplete,
      },
      { status: result.action === "created" ? 201 : 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook] Error al ingestar lead", { error: msg });
    return noStoreJson({ error: `Error al procesar lead: ${msg}` }, { status: 500 });
  }
}
