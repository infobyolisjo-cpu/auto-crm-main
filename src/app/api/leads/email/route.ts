import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeLead, ingestLead, type LeadInput, type IntakeResult } from "@/lib/lead-intake";

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
  // Remove URLs first to avoid matching numbers inside them
  const textWithoutUrls = text.replace(/https?:\/\/\S+/g, " ");
  const matches = textWithoutUrls.match(/(?:\+?52\s?)?(?:1\s?)?(?:\d[\s\-.]?){8,11}\d/g);
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

  // 5. Check we got something useful (checked before building lead)
  if (!name && !email && !phone) {
    return NextResponse.json(
      {
        error: "No se pudo extraer información útil del correo",
        hint: "Verifica el campo 'from' — debe incluir un email válido",
      },
      { status: 400 }
    );
  }

  // 6. Combine subject + body into notes
  const notes = (subject ? `Asunto: ${subject}\n\n` : "") + emailBody;

  // 7. Build LeadInput
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

  // 8. Normalize and ingest
  try {
    const normalized = normalizeLead(leadInput);
    const result: IntakeResult = await ingestLead(normalized);

    console.log("[/api/leads/email]", { action: result.action, id: result.contact.id, source: "email" });

    return NextResponse.json(
      {
        success: true,
        action: result.action,
        isIncomplete: result.isIncomplete,
        contact: {
          id: result.contact.id,
          name: result.contact.name,
          email: result.contact.email,
        },
      },
      { status: result.action === "created" ? 201 : 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/leads/email] Error:", message);
    return NextResponse.json(
      { error: "Error interno al procesar el correo." },
      { status: 500 }
    );
  }
}
