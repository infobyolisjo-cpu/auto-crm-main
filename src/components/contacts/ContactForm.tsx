"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

const contactSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email invalido").or(z.literal("")),
  phone: z.string(),
  company: z.string(),
  source: z.string(),
  channel: z.string(),
  campaign: z.string(),
  temperature: z.enum(["cold", "warm", "hot"]),
  notes: z.string(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<ContactFormData> & { id?: string };
}

export function ContactForm({ open, onClose, initialData }: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      company: initialData?.company || "",
      source: initialData?.source || "otro",
      channel: initialData?.channel || "",
      campaign: initialData?.campaign || "",
      temperature: initialData?.temperature || "cold",
      notes: initialData?.notes || "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const url = isEditing
        ? `/api/contacts/${initialData!.id}`
        : "/api/contacts";
      const method = isEditing ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(
        isEditing ? "Contacto actualizado" : "Contacto creado"
      );
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al guardar el contacto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-[rgba(0,0,0,0.12)_0px_0px_0px_1px,rgba(0,0,0,0.08)_0px_8px_24px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-[#171717] tracking-tight">
            {isEditing ? "Editar Contacto" : "Nuevo Contacto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[12px] font-medium text-[#737373]">Nombre *</Label>
            <Input id="name" {...register("name")} placeholder="Nombre completo"
              className="h-8 text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3]" />
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-[#737373]">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com"
                className="h-8 text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[12px] font-medium text-[#737373]">Teléfono</Label>
              <Input id="phone" {...register("phone")} placeholder="+52 55 1234 5678"
                className="h-8 text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-[12px] font-medium text-[#737373]">Empresa</Label>
            <Input id="company" {...register("company")} placeholder="Nombre de la empresa"
              className="h-8 text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#737373]">Fuente</Label>
              <Select
                value={watch("source")}
                onValueChange={(v) => v && setValue("source", v)}
              >
                <SelectTrigger className="h-8 text-[13px] cursor-pointer bg-[#fafafa] border-[#e5e5e5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Sitio web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                  <SelectItem value="llamada_fria">Llamada fría</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="formulario">Formulario</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="import">Importado</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#737373]">Temperatura</Label>
              <Select
                value={watch("temperature")}
                onValueChange={(v) =>
                  v && setValue("temperature", v as "cold" | "warm" | "hot")
                }
              >
                <SelectTrigger className="h-8 text-[13px] cursor-pointer bg-[#fafafa] border-[#e5e5e5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Frío</SelectItem>
                  <SelectItem value="warm">Tibio</SelectItem>
                  <SelectItem value="hot">Caliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#737373]">Canal</Label>
              <Select
                value={watch("channel")}
                onValueChange={(v) => v && setValue("channel", v)}
              >
                <SelectTrigger className="h-8 text-[13px] cursor-pointer bg-[#fafafa] border-[#e5e5e5]">
                  <SelectValue placeholder="Canal de contacto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="in_person">Presencial</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign" className="text-[12px] font-medium text-[#737373]">Campaña</Label>
              <Input id="campaign" {...register("campaign")} placeholder="ej. lanzamiento-mayo"
                className="h-8 text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[12px] font-medium text-[#737373]">Notas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Notas sobre el contacto..." rows={3}
              className="text-[13px] bg-[#fafafa] border-[#e5e5e5] focus:bg-white focus:border-[#171717] focus:ring-0 placeholder:text-[#a3a3a3] resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}
              className="h-8 px-3 text-[13px] cursor-pointer border-[#e5e5e5] text-[#737373] hover:bg-[#f5f5f5] hover:text-[#171717]">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}
              className="h-8 px-3 text-[13px] cursor-pointer bg-[#171717] text-white hover:bg-[#333] border-0">
              {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
