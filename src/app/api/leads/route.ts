import { NextRequest, NextResponse } from "next/server";
import {
  LeadInputSchema,
  normalizeLead,
  ingestLead,
  IntakeResult,
} from "@/lib/lead-intake";

// ---------------------------------------------------------------------------
// In-memory rate limiter: max 20 requests per IP per 60 seconds
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

// Evict expired rate-limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of RATE_LIMIT_MAP) {
      if (now > entry.resetAt) RATE_LIMIT_MAP.delete(ip);
    }
  }, 5 * 60 * 1000);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/leads
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Extract IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  // 2. Rate limit check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 3. Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // 4. Validate with Zod
  const parsed = LeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 5. Normalize
  const normalized = normalizeLead(parsed.data);

  // 6. Require at least one usable field
  if (!normalized.name && !normalized.email && !normalized.phone) {
    return NextResponse.json(
      {
        error: "Se requiere al menos uno: nombre, email, o teléfono",
        hint: "Envía al menos uno de: name/nombre, email/correo, phone/telefono",
      },
      { status: 400 }
    );
  }

  // 7. Ingest lead
  let result: IntakeResult;
  try {
    result = await ingestLead(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/leads] Error:", message);
    return NextResponse.json(
      { error: "Error interno al procesar el lead. Intenta de nuevo." },
      { status: 500 }
    );
  }

  const { contact, action, isIncomplete, deal } = result;

  console.log("[/api/leads]", {
    action,
    id: contact.id,
    source: contact.source,
    temperature: contact.temperature,
  });

  // 8. Success response
  const status = action === "created" ? 201 : 200;

  return NextResponse.json(
    {
      success: true,
      action,
      isIncomplete,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        source: contact.source,
        temperature: contact.temperature,
        score: contact.score,
        status: contact.status,
        isIncomplete: contact.isIncomplete,
      },
      deal: deal ? { id: deal.id, title: deal.title } : null,
    },
    { status }
  );
}
