import { cn } from "@/lib/utils";

/**
 * Marca do NEXUS: um núcleo com quatro nós conectados — o ecossistema
 * convergindo num ponto. Desenhada em grade de 24 para alinhar com os ícones.
 */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("flex-none", className)}
      aria-hidden
    >
      <path
        d="M12 2.6 20.5 7.3v9.4L12 21.4 3.5 16.7V7.3L12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.42"
      />
      <path d="M12 6.4v11.2M7 9.2l10 5.6M17 9.2l-10 5.6" stroke="currentColor" strokeWidth="1.1" opacity="0.32" />
      <circle cx="12" cy="12" r="3.05" fill="currentColor" />
      <circle cx="12" cy="6.4" r="1.35" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="17.6" r="1.35" fill="currentColor" opacity="0.85" />
      <circle cx="7" cy="9.2" r="1.35" fill="currentColor" opacity="0.85" />
      <circle cx="17" cy="14.8" r="1.35" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="text-[var(--accent)]" size={compact ? 22 : 26} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--text)]">
            NEXUS
          </span>
          <span className="mt-[3px] text-[0.5625rem] font-medium tracking-[0.22em] text-[var(--text-4)] uppercase">
            AIONIX
          </span>
        </span>
      )}
    </span>
  );
}
