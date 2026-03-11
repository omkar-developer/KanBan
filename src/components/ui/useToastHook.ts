import { createContext, useContext } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info"

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastCtx {
  toast: (message: string, type?: ToastType, duration?: number) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

export const ToastContext = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx.toast
}
