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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#737373]" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-[13px] bg-[#f5f5f5] border-transparent rounded-md placeholder:text-[#a3a3a3] focus:bg-white focus:border-[#e5e5e5] focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#a3a3a3] mr-0.5" />
          {TEMP_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterTemp(value)}
              className={`text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterTemp === value
                  ? "bg-[#171717] text-white"
                  : "bg-[#f5f5f5] text-[#737373] hover:bg-[#ebebeb] hover:text-[#171717]"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => window.open("/api/export?type=contacts")}
            className="ml-1 text-[12px] px-2.5 py-1 rounded-md font-medium bg-[#f5f5f5] text-[#737373] hover:bg-[#ebebeb] hover:text-[#171717] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg shadow-card overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373] w-[35%]">Contacto</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373] hidden sm:table-cell">Empresa</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373] hidden md:table-cell">Origen</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373]">Estado</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373] hidden md:table-cell">Score</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#737373] hidden lg:table-cell">Agregado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5f5]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#737373]">
                  Sin resultados para &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-[#fafafa] cursor-pointer transition-colors duration-100 group"
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
                        <p className="font-medium text-[13px] truncate text-[#171717] group-hover:text-[#5e6ad2] transition-colors">
                          {contact.name}
                        </p>
                        <p className="text-[11px] text-[#737373] truncate">{contact.email || contact.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[13px] text-[#737373]">
                    {contact.company || "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[12px] text-[#a3a3a3]">
                      {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge temperature={contact.temperature as Temperature} size="sm" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-12 bg-[#f5f5f5] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#171717]/40"
                          style={{ width: `${contact.score}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-[#a3a3a3]">{contact.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#a3a3a3]">
                    {formatDate(contact.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#a3a3a3]">
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  );
}
