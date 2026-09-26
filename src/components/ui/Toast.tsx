"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type Tone = "success" | "error" | "info" | "warn";

interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone" | "duration">> {
  id: number;
  description?: string;
  action?: ToastInput["action"];
  leaving?: boolean;
}

const ToastCtx = createContext<{
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
} | null>(null);

const TONE = {
  success: { icon: CheckCircle2, color: "var(--ok)" },
  error: { icon: XCircle, color: "var(--bad)" },
  warn: { icon: AlertTriangle, color: "var(--warn)" },
  info: { icon: Info, color: "var(--info)" },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    const t = setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 190);
    timers.current.set(-id, t);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++seq.current;
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "success",
        duration: input.duration ?? (input.tone === "error" ? 6500 : 3800),
        action: input.action,
      };
      setItems((prev) => [...prev.slice(-3), item]);
      timers.current.set(id, setTimeout(() => dismiss(id), item.duration));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
      >
        {items.map((t) => {
          const { icon: TIcon, color } = TONE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              style={{ ["--tone" as string]: color }}
              className={`pointer-events-auto relative flex w-full max-w-[26rem] items-start gap-2.5 rounded-[var(--radius-md)] border p-3 shadow-[var(--shadow-pop)] backdrop-blur-xl sm:min-w-[19rem] ${
                t.leaving ? "anim-out" : "anim-pop"
              }`}
            >
              <span className="absolute inset-0 -z-10 rounded-[var(--radius-md)] bg-[var(--surface-glass)]" />
              <TIcon size={16} strokeWidth={2} style={{ color }} className="mt-px flex-none" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-snug font-medium text-[var(--text)]">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs leading-snug text-[var(--text-3)]">{t.description}</p>
                ) : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    {t.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar aviso"
                className="-m-1 flex-none rounded p-1 text-[var(--text-4)] transition-colors hover:text-[var(--text)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}
