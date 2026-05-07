import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";

/**
 * POST /api/outreach/sent
 *
 * Called by n8n after a message has been sent successfully.
 * Updates contact status to "contacted" and logs an activity.
 * Never sends messages — that is n8n's job.
 *
 * Auth: x-outreach-secret header must match OUTREACH_SECRET env var.
 *
 * Body:
 *   {
 *     contact_id:       string (UUID, required)
 *     channel?:         string  — e.g. "whatsapp", "email" (default: "whatsapp")
 *     message_preview?: string  — first ~300 chars of the sent message
 *   }
 *
 * Response:
 *   { success: true, contact: { id, name, status, phone } }
 */

const SentBodySchema = z.object({
  contact_id: z.string().uuid("contact_id debe ser un UUID válido"),
  channel: z.string().max(50).optional(),
  message_preview: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = SentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.issues
          .map((e) => `${e.path.join(".") || "raíz"}: ${e.message}`)
          .join("; "),
      },
      { status: 400 }
    );
  }

  const { contact_id, channel, message_preview } = parsed.data;
  const channelLabel = channel ?? "whatsapp";

  // Fetch contact
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contact_id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  const contact = rows[0];
  const now = new Date();

  // Update status → contacted
  // Store outreach_sent_at, remove queue lock
  const existingMeta = (contact.metadata as Record<string, unknown>) ?? {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { outreach_queued_at: _removed, ...metaWithoutLock } = existingMeta;
  const updatedMeta: Record<string, unknown> = {
    ...metaWithoutLock,
    outreach_sent_at: now.toISOString(),
    outreach_channel: channelLabel,
  };

  const [updatedContact] = await db
    .update(contacts)
    .set({ status: "contacted", metadata: updatedMeta, updatedAt: now })
    .where(eq(contacts.id, contact_id))
    .returning();

  if (!updatedContact) {
    return NextResponse.json({ error: "Error al actualizar el contacto" }, { status: 500 });
  }

  // Log activity
  const descriptionLines = [
    `Mensaje de outreach enviado via ${channelLabel.toUpperCase()} (n8n)`,
  ];
  if (message_preview) {
    descriptionLines.push(`Mensaje: ${message_preview.slice(0, 300)}`);
  }

  await db.insert(activities).values({
    type: "follow_up",
    description: descriptionLines.join("\n"),
    contactId: contact_id,
    completedAt: now,
  });

  return NextResponse.json({
    success: true,
    contact: {
      id: updatedContact.id,
      name: updatedContact.name,
      status: updatedContact.status,
      phone: updatedContact.phone,
    },
  });
}
