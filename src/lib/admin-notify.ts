/**
 * admin-notify.ts
 * Sends real-time admin alerts when a hot lead enters the CRM.
 *
 * Called from ingestLead() after the DB transaction, fire-and-forget.
 * Never throws — a notification failure must never break lead creation.
 *
 * Env vars:
 *   RESEND_API_KEY      — Resend API key (already used for digest)
 *   ADMIN_EMAIL         — email address to notify
 *   ADMIN_WHATSAPP_NUMBER — optional, stored for future WhatsApp integration
 *
 * Graceful degradation:
 *   If env vars are missing → records notification_pending in contact metadata
 *   If Resend call fails    → logs error, does not throw
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { SOURCE_LABELS } from "@/lib/constants";
import type { IntakeResult } from "@/lib/lead-intake";
import type { LeadSource } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOT_SCORE_THRESHOLD = 70;
const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveAppUrl(): string {
  // Vercel injects VERCEL_PROJECT_PRODUCTION_URL automatically
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Fallback for dev
  return "http://localhost:3000";
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as LeadSource] ?? source;
}

function temperatureLabel(t: string): string {
  return t === "hot" ? "🔥 Caliente" : t === "warm" ? "🟠 Tibio" : "❄️ Frío";
}

// ---------------------------------------------------------------------------
// shouldNotify
// ---------------------------------------------------------------------------

function shouldNotify(contact: IntakeResult["contact"]): boolean {
  // Only alert for hot leads above threshold
  if (contact.temperature !== "hot") return false;
  if (contact.score < HOT_SCORE_THRESHOLD) return false;

  // 24h cooldown per contact
  const lastNotified = (contact.metadata as Record<string, unknown> | null)
    ?.lastAdminNotifiedAt as string | undefined;

  if (lastNotified) {
    const elapsed = Date.now() - new Date(lastNotified).getTime();
    if (elapsed < NOTIFICATION_COOLDOWN_MS) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// buildEmailHtml
// ---------------------------------------------------------------------------

function buildEmailHtml(
  contact: IntakeResult["contact"],
  dealId: string | null,
  appUrl: string
): string {
  const contactUrl = `${appUrl}/contacts/${contact.id}`;
  const dealUrl = dealId ? `${appUrl}/deals/${dealId}` : null;

  const rows: Array<[string, string | null]> = [
    ["Fuente", sourceLabel(contact.source)],
    ["Temperatura", temperatureLabel(contact.temperature)],
    ["Score", `${contact.score} / 100`],
    ["Teléfono", contact.phone],
    ["Email", contact.email],
    ["Empresa", (contact as { company?: string | null }).company ?? null],
    ["Interés", (contact as { interest?: string | null }).interest ?? null],
  ];

  const tableRows = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0; font-size:13px; color:#64748b; white-space:nowrap; vertical-align:top;">${label}</td>
        <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:500;">${value}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background:#dc2626; padding:20px 24px;">
      <p style="margin:0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#fecaca;">Auto-CRM · Lead Caliente</p>
      <h1 style="margin:4px 0 0; font-size:22px; color:#ffffff; font-weight:700;">${contact.name}</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px;">
      <table style="border-collapse:collapse; width:100%;">
        ${tableRows}
      </table>

      <!-- CTA -->
      <div style="margin-top:24px; display:flex; gap:12px;">
        <a href="${contactUrl}"
           style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600;">
          Ver en CRM →
        </a>
        ${dealUrl ? `<a href="${dealUrl}" style="display:inline-block; background:#f1f5f9; color:#1e293b; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; margin-left:10px;">Ver Deal</a>` : ""}
      </div>

      ${contact.phone ? `
      <p style="margin-top:20px; font-size:13px; color:#64748b;">
        Contactar por WhatsApp:
        <a href="https://wa.me/${contact.phone.replace(/[^\d]/g, "")}" style="color:#2563eb;">
          wa.me/${contact.phone.replace(/[^\d]/g, "")}
        </a>
      </p>` : ""}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 24px;">
      <p style="margin:0; font-size:11px; color:#94a3b8; text-align:center;">Auto-CRM · Notificación automática de lead caliente</p>
    </div>
  </div>
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// markNotified — updates metadata + logs activity
// ---------------------------------------------------------------------------

async function markNotified(
  contact: IntakeResult["contact"],
  status: "sent" | "pending",
  dealId: string | null
): Promise<void> {
  const now = new Date();
  const existingMeta = (contact.metadata as Record<string, unknown> | null) ?? {};

  const metaUpdate: Record<string, unknown> = {
    ...existingMeta,
    lastAdminNotifiedAt: now.toISOString(),
    lastAdminNotifyStatus: status,
  };

  await db
    .update(contacts)
    .set({ metadata: metaUpdate, updatedAt: now })
    .where(eq(contacts.id, contact.id));

  const description =
    status === "sent"
      ? "Notificación enviada al admin por lead caliente"
      : "Notificación pendiente al admin (email no configurado) — lead caliente detectado";

  await db.insert(activities).values({
    type: "note",
    description,
    contactId: contact.id,
    dealId: dealId ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// notifyAdminHotLead — main entry point
// ---------------------------------------------------------------------------

export async function notifyAdminHotLead(result: IntakeResult): Promise<void> {
  try {
    if (!shouldNotify(result.contact)) return;

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const dealId = result.deal?.id ?? null;

    // Graceful degradation: email not configured
    if (!apiKey || !adminEmail) {
      console.warn(
        `[admin-notify] ADMIN_EMAIL or RESEND_API_KEY not set — ` +
          `notification_pending for contact ${result.contact.id} (${result.contact.name})`
      );
      await markNotified(result.contact, "pending", dealId);
      return;
    }

    const appUrl = resolveAppUrl();
    const html = buildEmailHtml(result.contact, dealId, appUrl);
    const sourceName = sourceLabel(result.contact.source);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM ?? "Auto-CRM <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `🔥 Lead caliente: ${result.contact.name} (${sourceName})`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error(`[admin-notify] Resend error ${res.status}: ${errText}`);
      // Don't throw — lead was already saved successfully
      return;
    }

    await markNotified(result.contact, "sent", dealId);

    console.log(
      `[admin-notify] Notified admin <${adminEmail}> for hot lead ` +
        `${result.contact.id} (${result.contact.name}, score=${result.contact.score})`
    );
  } catch (err) {
    // Never let notification errors surface to the caller
    console.error("[admin-notify] Unexpected error:", err instanceof Error ? err.message : err);
  }
}
