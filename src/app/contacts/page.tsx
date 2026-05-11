"use client";

import { useState, useEffect } from "react";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Contact } from "@/types";
import { apiFetch } from "@/lib/api-fetch";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadContacts = () => {
    apiFetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => { setContacts(data); setLoading(false); });
  };

  useEffect(() => { loadContacts(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contactos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus leads y prospectos</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nuevo
        </Button>
      </div>

      {loading ? <TableSkeleton rows={6} columns={5} /> : <ContactsTable contacts={contacts} />}
      <ContactForm open={showForm} onClose={() => { setShowForm(false); loadContacts(); }} />
    </div>
  );
}
