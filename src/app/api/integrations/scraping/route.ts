import { NextRequest, NextResponse } from "next/server";
import { LeadInputSchema, normalizeLead, ingestLead } from "@/lib/lead-intake";

/**
 * POST /api/integrations/scraping
 *
 * Import a lead extracted via web scraping (Scrapling, Playwright, Puppeteer, etc.)
 *
 * Required env vars:
 *   SCRAPING_SECRET    — shared secret to authenticate scraping jobs
 *
 * Expected payload:
 *   {
 *     name?: string,
 *     email?: string,
 *     phone?: string,
 *     company?: string,
 *     source_url?: string,   // URL the lead was scraped from (stored in notes)
 *     notes?: string,
 *   }
 *
 * To activate: set SCRAPING_SECRET in Vercel env vars and send it
 * as the x-scraping-secret header.
 */
export async function POST(request: NextRequest) {
  if (!process.env.SCRAPING_SECRET) {
    return NextResponse.json(
      {
        error: "Integración de scraping no configurada",
        hint: "Configura SCRAPING_SECRET en las variables de entorno de Vercel",
      },
      { status: 503 }
    );
  }

  const headerSecret = request.headers.get("x-scraping-secret");
  if (headerSecret !== process.env.SCRAPING_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  // Prepend source_url to notes if provided
  const sourceUrl = typeof raw.source_url === "string" ? raw.source_url : null;
  const notesWithUrl = sourceUrl
    ? [sourceUrl ? `Origen: ${sourceUrl}` : null, raw.notes as string | undefined]
        .filter(Boolean)
        .join("\n")
    : (raw.notes as string | undefined);

  const parsed = LeadInputSchema.safeParse({
    ...raw,
    notes: notesWithUrl,
    source: "otro",
    channel: "web",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalized = normalizeLead(parsed.data);

  const result = await ingestLead(normalized);

  return NextResponse.json(
    {
      success: true,
      action: result.action,
      contact: { id: result.contact.id, name: result.contact.name, email: result.contact.email },
      deal: result.deal ? { id: result.deal.id } : null,
    },
    { status: result.action === "created" ? 201 : 200 }
  );
}
