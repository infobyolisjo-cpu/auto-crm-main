"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("").transform(() => undefined)),
  telefono: z.string().max(20).optional(),
  interes: z.string().max(200).optional(),
  mensaje: z.string().min(5, "Cuéntanos un poco más").max(1000),
});

type FormData = z.infer<typeof schema>;

interface PublicLeadFormProps {
  source?: string;
  campaign?: string;
  onSuccess?: () => void;
}

export function PublicLeadForm({
  source = "formulario_web",
  campaign,
  onSuccess,
}: PublicLeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fuente: source, campana: campaign }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Error al enviar");
      }
      setSubmitted(true);
      onSuccess?.();
      toast.success("¡Mensaje enviado! Te contactaremos pronto.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold">¡Mensaje recibido!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Nos pondremos en contacto contigo pronto. Gracias por escribirnos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-nombre">Nombre *</Label>
        <Input
          id="lead-nombre"
          placeholder="Tu nombre completo"
          {...register("nombre")}
        />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          type="email"
          placeholder="tu@email.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-telefono">WhatsApp / Teléfono</Label>
        <Input
          id="lead-telefono"
          placeholder="+52 55 1234 5678"
          {...register("telefono")}
        />
        {errors.telefono && (
          <p className="text-sm text-destructive">{errors.telefono.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-interes">¿Qué necesitas?</Label>
        <Input
          id="lead-interes"
          placeholder="Ej: Automatización de WhatsApp, sitio web, IA..."
          {...register("interes")}
        />
        {errors.interes && (
          <p className="text-sm text-destructive">{errors.interes.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-mensaje">Mensaje *</Label>
        <Textarea
          id="lead-mensaje"
          placeholder="Cuéntanos más sobre tu proyecto..."
          rows={4}
          {...register("mensaje")}
        />
        {errors.mensaje && (
          <p className="text-sm text-destructive">{errors.mensaje.message}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive border border-destructive/20 bg-destructive/5 rounded-md p-3">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Enviando..." : "Enviar mensaje"}
      </Button>
    </form>
  );
}
