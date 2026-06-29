"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

type AppToastVariant = "success" | "error" | "info";

export function AppToast({
  message,
  variant = "info",
  onClose,
}: {
  message: string;
  variant?: AppToastVariant;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timeout = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;

  const tone =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : variant === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-border bg-card text-foreground";

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2rem))] animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-xl shadow-black/10 ${tone}`}>
        {variant === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
        <p className="min-w-0 flex-1 leading-snug">{message}</p>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100" aria-label="Dismiss message">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
