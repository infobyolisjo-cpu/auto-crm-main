import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { noStoreJson } from "@/lib/security";
import { eq, like, or, desc } from "drizzle-orm";
import { checkCrmAuth } from "@/lib/auth";

function isDatabaseTimeout(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const maybeError = error as { code?: unknown; message?: unknown; cause?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    code === "CONNECT_TIMEOUT" ||
    message.toLowerCase().includes("connect_timeout") ||
    message.toLowerCase().includes("timeout") ||
    isDatabaseTimeout(maybeError.cause)
  );
}

export async function GET(request: NextRequest) {
  const denied = checkCrmAuth(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const temperature = searchParams.get("temperature");
  const source = searchParams.get("source");

  let query = db.select().from(contacts);

  if (search) {
    query = query.where(
      or(
        like(contacts.name, `%${search}%`),
        like(contacts.email, `%${search}%`),
        like(contacts.company, `%${search}%`)
      )
    ) as typeof query;
  }

  if (temperature) {
    query = query.where(eq(contacts.temperature, temperature)) as typeof query;
  }

  if (source) {
    query = query.where(eq(contacts.source, source)) as typeof query;
  }

  try {
    const results = await query.orderBy(desc(contacts.createdAt));
    return NextResponse.json(results);
  } catch (error) {
    console.error("[contacts] Database query failed", error);

    if (isDatabaseTimeout(error)) {
      return noStoreJson(
        {
          error: "DATABASE_UNAVAILABLE",
          message: "Database connection timeout in Preview",
        },
        { status: 503 }
      );
    }

    return noStoreJson({ error: "Error al obtener contactos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = checkCrmAuth(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { name, email, phone, company, source, channel, campaign, temperature, score, notes } =
    body;

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  try {
    const [result] = await db
      .insert(contacts)
      .values({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || "otro",
        channel: channel || null,
        campaign: campaign || null,
        temperature: temperature || "cold",
        score: score || 0,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al crear contacto: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
