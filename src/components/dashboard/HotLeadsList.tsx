"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, MessageCircle } from "lucide-react";
import Link from "next/link";
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

interface HotLeadsListProps {
  leads: HotLead[];
}

export function HotLeadsList({ leads }: HotLeadsListProps) {
  const displayed = leads.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-red-500" />
          Leads Calientes ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin leads calientes</p>
        ) : (
          <div className="space-y-3">
            {displayed.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/contacts/${lead.id}`}
                    className="text-sm font-medium text-primary hover:underline truncate block"
                  >
                    {lead.name}
                  </Link>
                  {lead.interest && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.interest}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{lead.score}/100</Badge>
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp(lead.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
