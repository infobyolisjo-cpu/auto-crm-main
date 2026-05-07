"use client";

import { Flame, MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { cleanPhoneForWhatsApp } from "@/lib/constants";

interface HotLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interest: string | null;
  score: number;
  source: string;
}

export function HotLeadsList({ leads }: { leads: HotLead[] }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-red-500" />
          Leads calientes
        </p>
        <span className="text-[11px] text-foreground/50 tabular-nums font-medium">{leads.length}</span>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin leads calientes</p>
      ) : (
        <div className="space-y-1">
          {leads.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors group">
              <ContactAvatar name={lead.name} temperature="hot" size="sm" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/contacts/${lead.id}`}
                  className="text-[13px] font-medium truncate block hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lead.name}
                </Link>
                {lead.interest && (
                  <p className="text-[11px] text-muted-foreground truncate">{lead.interest}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] tabular-nums text-foreground/50 font-medium">{lead.score}</span>
                {lead.phone ? (
                  <a
                    href={`https://wa.me/${cleanPhoneForWhatsApp(lead.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Contactar a ${lead.name} por WhatsApp`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                  </a>
                ) : (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
