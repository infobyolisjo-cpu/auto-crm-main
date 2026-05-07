import { NextRequest, NextResponse } from "next/server";
import { LeadInputSchema, normalizeLead, ingestLead } from "@/lib/lead-intake";

/**
 * POST /api/integrations/whatsapp
 *
 * Incoming lead from WhatsApp / Evolution API.
 *
 * Required env vars:
 *   EVOLUTION_API_URL    — e.g. https://evolution.yourdomain.com
 *   EVOLUTION_API_KEY    — API key for authentication
 *
 * Expected payload:
 *   {
 *     name: string,       // contact name
 *     phone: string,      // WhatsApp phone number (with country code)
 *     message?: string,   // first message / interest
 *     instance?: string,  // Evolution API instance name
 *   }
 *
 * To activate: set EVOLUTION_API_URL and EVOLUTION_API_KEY in Vercel env vars.
 */
export async function POST(request: NextRequest) {
  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
    return NextResponse.json(
      {
        error: "Integración de WhatsApp no configurada",
        hint: "Configura EVOLUTION_API_URL y EVOLUTION_API_KEY en las variables de entorno de Vercel",
        docs: "https://doc.evolution-api.com",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = LeadInputSchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    source: "whatsapp",
    channel: "whatsapp",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalized = normalizeLead(parsed.data);

  if (!normalized.name && !normalized.phone) {
    return NextResponse.json(
      { error: "Se requiere al menos name o phone" },
      { status: 400 }
    );
  }

  const result = await ingestLead(normalized);

  return NextResponse.json(
    {
      success: true,
      action: result.action,
      contact: { id: result.contact.id, name: result.contact.name, phone: result.contact.phone },
      deal: result.deal ? { id: result.deal.id } : null,
    },
    { status: result.action === "created" ? 201 : 200 }
  );
}
