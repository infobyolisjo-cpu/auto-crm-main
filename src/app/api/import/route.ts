import { NextRequest, NextResponse } from "next/server";
import { LeadInputSchema, normalizeLead, ingestLead } from "@/lib/lead-intake";
import { checkCrmAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const denied = checkCrmAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).contacts)
  ) {
    return NextResponse.json(
      { error: "Se requiere { contacts: [...] }" },
      { status: 400 }
    );
  }

  const contactList = (body as Record<string, unknown>).contacts as unknown[];

  if (contactList.length === 0) {
    return NextResponse.json(
      { error: "La lista de contactos está vacía" },
      { status: 400 }
    );
  }

  const results = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const raw of contactList) {
    const parsed = LeadInputSchema.safeParse(raw);

    if (!parsed.success) {
      results.failed++;
      const nameHint =
        typeof raw === "object" && raw !== null && "name" in raw
          ? String((raw as Record<string, unknown>).name)
          : "desconocido";
      results.errors.push(
        `Datos inválidos para "${nameHint}": ${parsed.error.issues[0]?.message ?? "error de validación"}`
      );
      continue;
    }

    // Ensure source defaults to "import" for CSV/bulk imports
    if (!parsed.data.source && !parsed.data.fuente) {
      parsed.data.source = "import";
    }

    const normalized = normalizeLead(parsed.data);

    if (!normalized.name) {
      results.failed++;
      results.errors.push(`Contacto sin nombre válido — omitido`);
      continue;
    }

    try {
      const result = await ingestLead(normalized);
      if (result.action === "created") {
        results.imported++;
      } else {
        results.updated++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Error importando "${normalized.name}": ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const status =
    results.failed > 0 && results.imported === 0 && results.updated === 0
      ? 422
      : 200;
  return NextResponse.json(results, { status });
}
