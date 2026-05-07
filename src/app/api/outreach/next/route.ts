import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";

/**
 * GET /api/outreach/next
 *
 * Returns the next cold scraping contact ready for outreach.
 * Called by n8n before sending a message — never sends anything itself.
 *
 * Auth: x-outreach-secret header must match OUTREACH_SECRET env var.
 *
 * Eligibility:
 *   - source = scraping
 *   - temperature = cold
 *   - status = new
 *   - phone must be present (required for WhatsApp outreach)
 *   - not picked by another n8n run in the last 30 minutes
 *
 * Response:
 *   { contact: { id, name, phone, email, company, interest, campaign, score, metadata } }
 *   { contact: null, message: "..." }  when queue is empty
 */

export async function GET(request: NextRequest) {
  if (!process.env.OUTREACH_SECRET) {
    return NextResponse.json(
      {
        error: "Outreach no configurado",
        hint: "Configura OUTREACH_SECRET en las variables de entorno de Vercel",
      },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-outreach-secret");
  if (provided !== process.env.OUTREACH_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Find the oldest eligible contact.
  // Exclude contacts picked in the last 30 min to prevent double-sends
  // when n8n retries before calling /sent.
  const rows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.source, "scraping"),
        eq(contacts.temperature, "cold"),
        eq(contacts.status, "new"),
        isNotNull(contacts.phone),
        sql`(
          ${contacts.metadata}->>'outreach_queued_at' IS NULL
          OR (${contacts.metadata}->>'outreach_queued_at')::timestamptz
              < NOW() - INTERVAL '30 minutes'
        )`
      )
    )
    .orderBy(contacts.createdAt)
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { contact: null, message: "No hay contactos disponibles para outreach" },
      { status: 200 }
    );
  }

  const contact = rows[0];

  // Stamp outreach_queued_at to lock this contact for 30 min
  const existingMeta = (contact.metadata as Record<string, unknown>) ?? {};
  await db
    .update(contacts)
    .set({
      metadata: { ...existingMeta, outreach_queued_at: new Date().toISOString() },
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contact.id));

  return NextResponse.json({
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      company: contact.company,
      interest: contact.interest,
      campaign: contact.campaign,
      score: contact.score,
      temperature: contact.temperature,
      metadata: contact.metadata,
    },
  });
}
