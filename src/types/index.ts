export type Temperature = "cold" | "warm" | "hot";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "lost";

export type ActivityType = "call" | "email" | "meeting" | "note" | "follow_up";

export type LeadSource =
  | "website"
  | "whatsapp"
  | "whatsapp_agent_kit"
  | "instagram"
  | "linkedin"
  | "referido"
  | "redes_sociales"
  | "llamada_fria"
  | "email"
  | "formulario"
  | "formulario_web"
  | "evento"
  | "import"
  | "webhook"
  | "manual"
  | "otro";

export type Channel =
  | "web"
  | "whatsapp"
  | "instagram"
  | "linkedin"
  | "email"
  | "phone"
  | "in_person"
  | "otro";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  channel: Channel | null;
  campaign: string | null;
  temperature: Temperature;
  score: number;
  notes: string | null;
  status: LeadStatus;
  interest: string | null;
  metadata: Record<string, unknown> | null;
  isIncomplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stageId: string;
  contactId: string;
  expectedClose: Date | null;
  probability: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  contactId: string;
  dealId: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CrmConfig {
  business: {
    name?: string;
    type: string;
    industry: string;
    teamSize: string;
  };
  pipeline: {
    stages: Array<{
      name: string;
      order: number;
      color: string;
      isWon: boolean;
      isLost: boolean;
    }>;
  };
  leadSources: string[];
  preferences: {
    language: "es" | "en";
    theme: "light" | "dark" | "auto";
  };
}

export interface DealWithContact extends Deal {
  contact?: Contact;
  stage?: PipelineStage;
  contactName?: string | null;
  contactTemperature?: string | null;
}

export interface ContactWithDeals extends Contact {
  deals?: Deal[];
  activities?: Activity[];
}

export interface PipelineColumn extends PipelineStage {
  deals: DealWithContact[];
}

export interface DashboardStats {
  totalContacts: number;
  activeDeals: number;
  totalPipelineValue: number;
  wonDealsValue: number;
  conversionRate: number;
  hotLeads: number;
  newLeadsThisWeek: number;
  uncontactedLeads: number;
  leadsBySource: Array<{ source: string; count: number }>;
}
