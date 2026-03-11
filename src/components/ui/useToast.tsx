import { useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import { ToastContext, type ToastType, type ToastItem } from "./useToastHook"

interface ToastCtx {
  toast: (message: string, type?: ToastType, duration?: number) => void
}

// Re-export types for convenience
export type { ToastType }

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = "info", duration = 3500) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Config per type ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ToastType, { accent: string; iconPath: string; bg: string; border: string }> = {
  success: {
    accent:   "#4ade80",
    bg:       "rgba(74,222,128,0.07)",
    border:   "rgba(74,222,128,0.2)",
    iconPath: "M4 7.5L6.5 10L11 5",
  },
  error: {
    accent:   "#f87171",
    bg:       "rgba(248,113,113,0.07)",
    border:   "rgba(248,113,113,0.2)",
    iconPath: "M4.5 4.5L10 10M10 4.5L4.5 10",
  },
  warning: {
    accent:   "#fbbf24",
    bg:       "rgba(251,191,36,0.07)",
    border:   "rgba(251,191,36,0.2)",
    iconPath: "M7.5 4.5V8M7.5 10.5V11",
  },
  info: {
    accent:   "var(--accent, #38bdf8)",
    bg:       "var(--accent-muted, rgba(56,189,248,0.07))",
    border:   "rgba(56,189,248,0.2)",
    iconPath: "M7.5 7V11M7.5 4.5V5",
  },
}

// ── Single toast ──────────────────────────────────────────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[item.type]
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(item.id), 180)
  }

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), item.duration - 200)
    return () => clearTimeout(t)
  }, [item.duration])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px 10px 14px",
        borderRadius: "10px",
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset",
        minWidth: "260px",
        maxWidth: "360px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-body, 'DM Sans', system-ui, sans-serif)",
        animation: exiting
          ? "toastOut 0.18s ease-in forwards"
          : "toastIn 0.24s cubic-bezier(0.34,1.4,0.64,1) forwards",
      }}
    >
      {/* Left accent stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
        background: cfg.accent,
        borderRadius: "10px 0 0 10px",
      }} />

      {/* Icon */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.type === "warning" ? (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: cfg.accent }}>
            <path d="M7.5 2L13.5 13H1.5L7.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d={cfg.iconPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: cfg.accent }}>
            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d={cfg.iconPath} stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Message */}
      <span
        className="text-[13px] font-medium flex-1 leading-snug"
        style={{ color: "var(--text-primary, #f0f0f0)" }}
      >
        {item.message}
      </span>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md transition-colors hover:bg-white/10"
        style={{ color: "var(--text-muted, #666670)", border: "none", cursor: "pointer", background: "transparent" }}
        aria-label="Dismiss"
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Stack ─────────────────────────────────────────────────────────────────────

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(-6px) scale(0.97); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast item={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  )
}