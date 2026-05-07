import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { normalizeLead, ingestLead } from "@/lib/lead-intake";
import type { LeadInput } from "@/lib/lead-intake";

/**
 * POST /api/integrations/scraping
 *
 * Bulk or single lead import from web scraping tools.
 * Compatible with: Scrapling, Playwright, Apify, Puppeteer, CSV pipelines.
 *
 * Authentication (required):
 *   Set SCRAPING_SECRET env var.
 *   Send it as header: x-scraping-secret: <value>
 *
 * Payload formats accepted:
 *   Single lead:   { name, company, email, phone, website, industry, location, source_url, notes }
 *   Batch:         { leads: [...] }  |  { items: [...] }  |  { data: [...] }  |  [ {...}, ... ]
 *   Batch options: top-level source and campaign apply to all leads in batch
 *
 * Deduplication order:
 *   1. email match  → ingestLead() updates existing contact
 *   2. phone match  → ingestLead() updates existing contact
 *   3. domain match → pre-check; skipped if domain already in CRM (only for leads with no email/phone)
 *
 * Response:
 *   { imported, updated, duplicates, failed, total, errors?, results }
 */

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.es", "yahoo.com.mx",
  "hotmail.com", "hotmail.es", "outlook.com", "live.com", "icloud.com",
  "me.com", "protonmail.com", "proton.me", "tutanota.com", "yandex.com",
  "aol.com", "mail.com", "zoho.com",
]);

const ScrapedLeadSchema = z.object({
  // Contact
  name: z.string().max(200).optional(),
  nombre: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  empresa: z.string().max(200).optional(),
  email: z
    .string()
    .max(200)
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Formato de email inválido",
    }),
  phone: z.string().max(30).optional(),
  telefono: z.string().max(30).optional(),

  // Scraping-specific
  website: z.string().max(500).optional(),
  industry: z.string().max(200).optional(),
  industria: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  ubicacion: z.string().max(200).optional(),
  source_url: z.string().max(1000).optional(),

  // Lead context
  notes: z.string().max(5000).optional(),
  notas: z.string().max(5000).optional(),
  interest: z.string().max(500).optional(),
  interes: z.string().max(500).optional(),

  // Per-lead routing overrides (batch-level source/campaign take lower priority)
  source: z.string().max(50).optional(),
  fuente: z.string().max(50).optional(),
  channel: z.string().max(50).optional(),
  canal: z.string().max(50).optional(),
  campaign: z.string().max(200).optional(),
  campana: z.string().max(200).optional(),
});

type ScrapedLead = z.infer<typeof ScrapedLeadSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDomain(url: string): string | null {
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(withProtocol).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function extractEmailDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  return FREE_EMAIL_DOMAINS.has(domain) ? null : domain;
}

async function domainExistsInCRM(domain: string): Promise<string | null> {
  const rows = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(sql`${contacts.metadata}->>'domain' = ${domain}`)
    .limit(1);
  return rows[0]?.id ?? null;
}

function buildLeadInput(
  lead: ScrapedLead,
  batchSource?: string,
  batchCampaign?: string
): { input: LeadInput; domain: string | null } {
  const website = lead.website;
  const email = lead.email;
  const industry = lead.industry ?? lead.industria ?? null;
  const location = lead.location ?? lead.ubicacion ?? null;
  const sourceUrl = lead.source_url ?? null;

  // Domain: prefer website, fall back to business email domain
  let domain: string | null = null;
  if (website) domain = extractDomain(website);
  if (!domain && email) domain = extractEmailDomain(email);

  // Notes: stack scraping context fields
  const noteLines: string[] = [];
  if (sourceUrl) noteLines.push(`Origen: ${sourceUrl}`);
  if (website) noteLines.push(`Web: ${website}`);
  if (industry) noteLines.push(`Industria: ${industry}`);
  if (location) noteLines.push(`Ubicación: ${location}`);
  const rawNotes = (lead.notes ?? lead.notas ?? "").trim();
  if (rawNotes) noteLines.push(rawNotes);
  const notes = noteLines.join("\n") || undefined;

  // Metadata stored on the contact
  const metadata: Record<string, unknown> = {};
  if (domain) metadata.domain = domain;
  if (website) metadata.website = website;
  if (industry) metadata.industry = industry;
  if (location) metadata.location = location;
  if (sourceUrl) metadata.source_url = sourceUrl;

  const input = {
    name: lead.name ?? lead.nombre,
    email,
    phone: lead.phone ?? lead.telefono,
    company: lead.company ?? lead.empresa,
    notes,
    source: lead.source ?? lead.fuente ?? batchSource ?? "scraping",
    channel: lead.channel ?? lead.canal ?? "web",
    campaign: lead.campaign ?? lead.campana ?? batchCampaign,
    interest: lead.interest ?? lead.interes,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  } as LeadInput;

  return { input, domain };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!process.env.SCRAPING_SECRET) {
    return NextResponse.json(
      {
        error: "Scraping no configurado",
        hint: "Configura SCRAPING_SECRET en las variables de entorno de Vercel",
      },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-scraping-secret");
  if (provided !== process.env.SCRAPING_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Normalise payload → flat array of raw leads
  let rawLeads: unknown[] = [];
  let batchSource: string | undefined;
  let batchCampaign: string | undefined;

  if (Array.isArray(body)) {
    rawLeads = body;
  } else if (typeof body === "object" && body !== null) {
    const obj = body as Record<string, unknown>;
    batchSource = typeof obj.source === "string" ? obj.source : undefined;
    batchCampaign = typeof obj.campaign === "string" ? obj.campaign : undefined;

    // Accept: leads / items / data wrappers
    const leadsArray = obj.leads ?? obj.items ?? obj.data;
    if (Array.isArray(leadsArray)) {
      rawLeads = leadsArray;
    } else {
      // Single object — treat as one lead
      rawLeads = [body];
    }
  } else {
    return NextResponse.json({ error: "Payload debe ser un objeto o array JSON" }, { status: 400 });
  }

  if (rawLeads.length === 0) {
    return NextResponse.json({ error: "No se recibieron leads" }, { status: 400 });
  }

  if (rawLeads.length > 500) {
    return NextResponse.json(
      { error: "Máximo 500 leads por request", received: rawLeads.length },
      { status: 400 }
    );
  }

  // Process each lead
  const errors: Array<{ index: number; input: unknown; error: string }> = [];
  const results: Array<{
    action: "created" | "updated" | "duplicate";
    contact: {
      id: string;
      name: string;
      email: string | null;
      source: string;
      temperature: string;
      score: number;
    };
    deal: { id: string; title: string } | null;
  }> = [];

  let imported = 0;
  let updated = 0;
  let duplicates = 0;
  let failed = 0;

  for (let i = 0; i < rawLeads.length; i++) {
    const raw = rawLeads[i];

    // --- Validate ---
    const parsed = ScrapedLeadSchema.safeParse(
      typeof raw === "object" && raw !== null ? raw : {}
    );

    if (!parsed.success) {
      failed++;
      errors.push({
        index: i,
        input: raw,
        error: parsed.error.issues.map((e) => `${e.path.join(".") || "raíz"}: ${e.message}`).join("; "),
      });
      continue;
    }

    const lead = parsed.data;

    // --- Require at least one identifiable field ---
    const identifier = [
      lead.name, lead.nombre, lead.company, lead.empresa, lead.email,
      lead.phone, lead.telefono,
    ].find((v) => v && v.trim().length > 0);

    if (!identifier) {
      failed++;
      errors.push({
        index: i,
        input: raw,
        error: "Lead sin datos identificables: se requiere nombre, empresa, email o teléfono",
      });
      continue;
    }

    const { input, domain } = buildLeadInput(lead, batchSource, batchCampaign);

    // --- Domain dedup (only for leads with no email/phone to avoid double-counting) ---
    const hasEmailOrPhone = !!(
      (lead.email ?? "").trim() || (lead.phone ?? lead.telefono ?? "").trim()
    );

    if (!hasEmailOrPhone && domain) {
      const existingId = await domainExistsInCRM(domain);
      if (existingId) {
        duplicates++;
        results.push({
          action: "duplicate",
          contact: { id: existingId, name: "", email: null, source: "scraping", temperature: "", score: 0 },
          deal: null,
        });
        continue;
      }
    }

    // --- Ingest via shared pipeline (handles email/phone dedup, scoring, deal/activity creation) ---
    try {
      const normalized = normalizeLead(input);
      const result = await ingestLead(normalized);

      if (result.action === "created") imported++;
      else updated++;

      results.push({
        action: result.action,
        contact: {
          id: result.contact.id,
          name: result.contact.name,
          email: result.contact.email,
          source: result.contact.source,
          temperature: result.contact.temperature,
          score: result.contact.score,
        },
        deal: result.deal ? { id: result.deal.id, title: result.deal.title } : null,
      });
    } catch (err) {
      failed++;
      errors.push({
        index: i,
        input: raw,
        error: err instanceof Error ? err.message : "Error desconocido al ingestar lead",
      });
    }
  }

  return NextResponse.json(
    {
      imported,
      updated,
      duplicates,
      failed,
      total: rawLeads.length,
      ...(errors.length > 0 ? { errors } : {}),
      results,
    },
    { status: failed === rawLeads.length && rawLeads.length > 0 ? 422 : 200 }
  );
}
