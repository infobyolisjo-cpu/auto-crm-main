"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search, Users, Download, SlidersHorizontal } from "lucide-react";
import { formatDate } from "@/lib/constants";
import { SOURCE_LABELS } from "@/lib/constants";
import type { Contact, Temperature, LeadSource } from "@/types";

interface ContactsTableProps {
  contacts: Contact[];
}

const TEMP_FILTERS = [
  { value: "" as const, label: "Todos" },
  { value: "hot" as const, label: "Caliente" },
  { value: "warm" as const, label: "Tibio" },
  { value: "cold" as const, label: "Frío" },
];

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<Temperature | "">("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    return matchesSearch && (!filterTemp || c.temperature === filterTemp);
  });

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no hay contactos"
        description="Importa tus leads o agrega el primero manualmente para empezar."
        actionLabel="Agregar contacto"
        onAction={() => router.push("/contacts?new=true")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-transparent"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
          {TEMP_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterTemp(value)}
              className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterTemp === value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => window.open("/api/export?type=contacts")}
            className="ml-1 text-[12px] px-2.5 py-1 rounded-md font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 w-[35%]">Contacto</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden sm:table-cell">Empresa</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden md:table-cell">Origen</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Estado</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden md:table-cell">Score</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hidden lg:table-cell">Agregado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Sin resultados para &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors duration-100 group"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContactAvatar
                        name={contact.name}
                        temperature={contact.temperature as Temperature}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-[13px] truncate group-hover:text-primary transition-colors">{contact.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{contact.email || contact.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[13px] text-foreground/65">
                    {contact.company || "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[12px] text-foreground/60">
                      {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge temperature={contact.temperature as Temperature} size="sm" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${contact.score}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{contact.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-muted-foreground">
                    {formatDate(contact.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  );
}
