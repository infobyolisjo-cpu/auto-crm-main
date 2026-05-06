import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeLead, ingestLead } from "@/lib/lead-intake";
import type { LeadInput } from "@/lib/lead-intake";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const EmailLeadSchema = z.object({
  from: z.string().min(1).max(500),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10000),
  receivedAt: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseEmailAddress(from: string): { name: string | null; email: string | null } {
  // Try "Some Name <email@domain.com>" pattern
  const namedMatch = from.match(/^["']?(.+?)["']?\s*<([^>]+)>/);
  if (namedMatch) {
    const name = namedMatch[1].trim().replace(/^["']|["']$/g, "") || null;
    const email = namedMatch[2].toLowerCase().trim() || null;
    return { name, email };
  }

  // Try bare email
  const bareMatch = from.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (bareMatch) {
    return { name: null, email: bareMatch[0].toLowerCase() };
  }

  // Fallback: treat from as name
  const name = from.trim() || null;
  return { name, email: null };
}

function extractPhoneFromText(text: string): string | null {
  const matches = text.match(/(?:\+?52\s?)?(?:1\s?)?(?:\d[\s\-.]?){8,11}\d/g);
  if (!matches || matches.length === 0) return null;

  const cleaned = matches[0].replace(/[\s\-.]/g, "");
  return cleaned.length >= 8 ? cleaned : null;
}

// ---------------------------------------------------------------------------
// POST /api/leads/email
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // 2. Validate with Zod
  const parsed = EmailLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { from, subject, body: emailBody, receivedAt } = parsed.data;

  // 3. Parse From header
  const { name, email } = parseEmailAddress(from);

  // 4. Extract phone from body
  const phone = extractPhoneFromText(emailBody);

  // 8. Check we got something useful (checked before building lead)
  if (!name && !email && !phone) {
    return NextResponse.json(
      {
        error: "No se pudo extraer información útil del correo",
        hint: "Verifica el campo 'from' — debe incluir un email válido",
      },
      { status: 400 }
    );
  }

  // 5. Combine subject + body into notes
  const notes = (subject ? `Asunto: ${subject}\n\n` : "") + emailBody;

  // 6. Build LeadInput
  const leadInput: LeadInput = {
    name: name ?? undefined,
    email: email ?? undefined,
    correo: undefined,
    phone: phone ?? undefined,
    notes,
    source: "email",
    metadata: {
      originalFrom: from,
      subject,
      receivedAt,
    },
  };

  // 7. Normalize and ingest
  let result;
  try {
    const normalized = normalizeLead(leadInput);
    result = await ingestLead(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/leads/email] Error:", message);
    return NextResponse.json(
      { error: "Error interno al procesar el correo." },
      { status: 500 }
    );
  }

  const { contact, action, isIncomplete } = result;

  console.log("[/api/leads/email]", { action, id: contact.id, source: "email" });

  const statusCode = action === "created" ? 201 : 200;

  return NextResponse.json(
    {
      success: true,
      action,
      isIncomplete,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
      },
    },
    { status: statusCode }
  );
}
