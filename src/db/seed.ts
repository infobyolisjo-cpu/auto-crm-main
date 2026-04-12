#!/usr/bin/env npx tsx
/**
 * Demo data seed — PostgreSQL
 *
 * Inserts sample contacts, deals, and activities for testing.
 * Run after 'npm run init' (schema must already exist).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx src/db/seed.ts
 */

import path from "path";
import fs from "fs";
import { asc } from "drizzle-orm";

// Load .env.local for local dev
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const { db } = await import("./index.js");
  const { contacts, deals, activities, pipelineStages } = await import("./schema.js");

  console.log("Seeding demo data...");

  const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));

  if (stages.length === 0) {
    console.error("No pipeline stages found. Run 'npm run init' first.");
    process.exit(1);
  }

  const stageMap = new Map(stages.map((s) => [s.name, s.id]));

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86400_000);

  const contactData = [
    {
      name: "Maria Garcia",
      email: "maria@techstartup.mx",
      phone: "+52 55 1234 5678",
      company: "TechStartup MX",
      source: "website",
      channel: "web",
      temperature: "hot" as const,
      score: 85,
      notes: "Interesada en plan empresarial. Tiene equipo de 15 personas.",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
    {
      name: "Carlos Rodriguez",
      email: "carlos@inmobiliaria.com",
      phone: "+52 33 9876 5432",
      company: "Inmobiliaria Rodriguez",
      source: "referido",
      channel: "phone",
      temperature: "warm" as const,
      score: 60,
      notes: "Referido por Juan. Busca automatizar seguimiento de clientes.",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(3),
    },
    {
      name: "Ana Martinez",
      email: "ana@consultoria.mx",
      phone: "+52 81 5555 1234",
      company: "Martinez Consultores",
      source: "linkedin",
      channel: "linkedin",
      temperature: "warm" as const,
      score: 55,
      notes: "Nos contacto por LinkedIn. Consultoria de RRHH.",
      createdAt: daysAgo(7),
      updatedAt: daysAgo(2),
    },
    {
      name: "Roberto Sanchez",
      email: "roberto@tienda.com",
      phone: "+52 55 7777 8888",
      company: "Tienda en Linea SA",
      source: "formulario",
      channel: "web",
      temperature: "cold" as const,
      score: 25,
      notes: "Lleno formulario web. E-commerce de ropa.",
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
    {
      name: "Laura Hernandez",
      email: "laura@agencia.mx",
      phone: "+52 33 4444 5555",
      company: "Agencia Creativa",
      source: "evento",
      channel: "in_person",
      temperature: "hot" as const,
      score: 90,
      notes: "Conocida en evento de networking. Muy interesada, pidio demo inmediata.",
      createdAt: daysAgo(3),
      updatedAt: now,
    },
  ];

  const insertedContacts = await db
    .insert(contacts)
    .values(contactData)
    .returning({ id: contacts.id, name: contacts.name });

  console.log(`Created ${insertedContacts.length} contacts`);

  const contactByName = new Map(insertedContacts.map((c) => [c.name, c.id]));

  const dealData = [
    {
      title: "Plan Empresarial - TechStartup MX",
      value: 250000,
      stageId: stageMap.get("Propuesta") ?? stages[2].id,
      contactId: contactByName.get("Maria Garcia")!,
      expectedClose: daysAhead(15),
      probability: 70,
      notes: "Enviamos propuesta. Esperando respuesta del director.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
    },
    {
      title: "CRM Personalizado - Inmobiliaria",
      value: 180000,
      stageId: stageMap.get("Contactado") ?? stages[1].id,
      contactId: contactByName.get("Carlos Rodriguez")!,
      expectedClose: daysAhead(30),
      probability: 40,
      notes: "Primera llamada realizada. Agendamos demo para la proxima semana.",
      createdAt: daysAgo(8),
      updatedAt: daysAgo(3),
    },
    {
      title: "Servicio Premium - Agencia Creativa",
      value: 450000,
      stageId: stageMap.get("Negociacion") ?? stages[3].id,
      contactId: contactByName.get("Laura Hernandez")!,
      expectedClose: daysAhead(7),
      probability: 85,
      notes: "Negociando precio. Muy probable que cierre esta semana.",
      createdAt: daysAgo(2),
      updatedAt: now,
    },
  ];

  const insertedDeals = await db
    .insert(deals)
    .values(dealData)
    .returning({ id: deals.id, title: deals.title });

  console.log(`Created ${insertedDeals.length} deals`);

  const dealByTitle = new Map(insertedDeals.map((d) => [d.title, d.id]));

  const activityData = [
    {
      type: "email",
      description: "Envio de propuesta comercial con pricing y features del plan empresarial.",
      contactId: contactByName.get("Maria Garcia")!,
      dealId: dealByTitle.get("Plan Empresarial - TechStartup MX"),
      completedAt: daysAgo(2),
      createdAt: daysAgo(2),
    },
    {
      type: "call",
      description: "Llamada de introduccion. Carlos mostro interes en automatizar su proceso.",
      contactId: contactByName.get("Carlos Rodriguez")!,
      dealId: dealByTitle.get("CRM Personalizado - Inmobiliaria"),
      completedAt: daysAgo(5),
      createdAt: daysAgo(5),
    },
    {
      type: "meeting",
      description: "Reunion presencial en evento de networking. Intercambiamos tarjetas.",
      contactId: contactByName.get("Laura Hernandez")!,
      dealId: dealByTitle.get("Servicio Premium - Agencia Creativa"),
      completedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
    {
      type: "follow_up",
      description: "Dar seguimiento a Maria sobre la propuesta enviada. Preguntar si tiene dudas.",
      contactId: contactByName.get("Maria Garcia")!,
      dealId: dealByTitle.get("Plan Empresarial - TechStartup MX"),
      scheduledAt: daysAhead(1),
      createdAt: now,
    },
    {
      type: "follow_up",
      description: "Agendar demo con Carlos para mostrar el CRM personalizado.",
      contactId: contactByName.get("Carlos Rodriguez")!,
      dealId: dealByTitle.get("CRM Personalizado - Inmobiliaria"),
      scheduledAt: daysAhead(3),
      createdAt: now,
    },
    {
      type: "note",
      description: "Roberto parece no estar listo para comprar. Agregar a newsletter y dar seguimiento en 30 dias.",
      contactId: contactByName.get("Roberto Sanchez")!,
      completedAt: daysAgo(10),
      createdAt: daysAgo(10),
    },
  ];

  const insertedActivities = await db
    .insert(activities)
    .values(activityData)
    .returning({ id: activities.id });

  console.log(`Created ${insertedActivities.length} activities`);
  console.log("\nSeed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
