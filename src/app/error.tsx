"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRM error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4">
        <h2 className="text-base font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          {error.message ?? "Error inesperado. Intenta de nuevo."}
        </p>
        <button
          onClick={reset}
          className="text-sm underline underline-offset-2 text-primary"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
