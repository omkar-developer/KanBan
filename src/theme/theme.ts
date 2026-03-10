// ── Theme system ──────────────────────────────────────────────────────────────
// All colours are CSS custom properties. Components should use var(--token).
// Fonts degrade gracefully: system fonts work offline, Google Fonts are loaded
// lazily only if the browser is online. No hard dependency on external URLs.

export interface Theme {
  id:       string
  label:    string
  // fontStack: full CSS font-family. First entry is Google Font (loaded lazily
  //            if online), the rest are system fallbacks that work offline.
  fontStack:  string
  fontUrl?:   string   // Google Fonts URL — only loaded when navigator.onLine
  tokens: Record<string, string>
}

// Helper to get theme token as CSS variable
export const getThemeToken = (tokenName: string): string => `var(${tokenName}, var(--${tokenName}))`

export const themes: Theme[] = [
  // ── Default dark ────────────────────────────────────────────────────────
  {
    id:       "dark",
    label:    "Dark",
    fontStack: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#0a0a0a",
      "--bg-column":      "linear-gradient(180deg,#111 0%,#0d0d0d 100%)",
      "--bg-column-solid":"#0f0f0f",
      "--bg-card":        "#161616",
      "--bg-modal":       "#1a1a1a",
      "--bg-popover":     "#1c1c1c",
      "--bg-input":       "rgba(255,255,255,0.05)",
      "--border":         "rgba(255,255,255,0.08)",
      "--border-hover":   "rgba(255,255,255,0.15)",
      "--border-input":   "rgba(255,255,255,0.12)",
      "--border-focus":   "rgba(56,189,248,0.35)",
      "--text-primary":   "#f0f0f0",
      "--text-secondary": "#a8a8b0",
      "--text-muted":     "#666670",
      "--text-ghost":     "#3a3a40",
      "--accent":         "#38bdf8",
      "--accent-muted":   "rgba(56,189,248,0.18)",
      "--scrollbar":      "rgba(255,255,255,0.12)",
    },
  },

  // ── Midnight ────────────────────────────────────────────────────────────
  {
    id:       "midnight",
    label:    "Midnight",
    fontStack: "'Inter', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'Inter', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#0b0c18",
      "--bg-column":      "linear-gradient(180deg,#121428 0%,#0f1020 100%)",
      "--bg-column-solid":"#101122",
      "--bg-card":        "#151730",
      "--bg-modal":       "#161835",
      "--bg-popover":     "#1a1c38",
      "--bg-input":       "rgba(129,140,248,0.06)",
      "--border":         "rgba(129,140,248,0.12)",
      "--border-hover":   "rgba(129,140,248,0.22)",
      "--border-input":   "rgba(129,140,248,0.15)",
      "--border-focus":   "rgba(129,140,248,0.40)",
      "--text-primary":   "#e8e8ff",
      "--text-secondary": "#a0a0cc",
      "--text-muted":     "#5a5a90",
      "--text-ghost":     "#2a2a40",
      "--accent":         "#818cf8",
      "--accent-muted":   "rgba(129,140,248,0.20)",
      "--scrollbar":      "rgba(129,140,248,0.12)",
    },
  },

  // ── Forest ──────────────────────────────────────────────────────────────
  {
    id:       "forest",
    label:    "Forest",
    fontStack: "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#0d120d",
      "--bg-column":      "linear-gradient(180deg,#121912 0%,#0e130e 100%)",
      "--bg-column-solid":"#0f150f",
      "--bg-card":        "#141c14",
      "--bg-modal":       "#161e16",
      "--bg-popover":     "#182318",
      "--bg-input":       "rgba(74,222,128,0.06)",
      "--border":         "rgba(74,222,128,0.12)",
      "--border-hover":   "rgba(74,222,128,0.22)",
      "--border-input":   "rgba(74,222,128,0.15)",
      "--border-focus":   "rgba(74,222,128,0.40)",
      "--text-primary":   "#e8f5e8",
      "--text-secondary": "#88aa88",
      "--text-muted":     "#4a6a4a",
      "--text-ghost":     "#2a3a2a",
      "--accent":         "#4ade80",
      "--accent-muted":   "rgba(74,222,128,0.20)",
      "--scrollbar":      "rgba(74,222,128,0.12)",
    },
  },

  // ── Light ───────────────────────────────────────────────────────────────
  {
    id:       "light",
    label:    "Light",
    fontStack: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#fafafa",
      "--bg-column":      "linear-gradient(180deg,#ffffff 0%,#f5f5f7 100%)",
      "--bg-column-solid":"#ffffff",
      "--bg-card":        "#ffffff",
      "--bg-modal":       "#ffffff",
      "--bg-popover":     "#ffffff",
      "--bg-input":       "rgba(0,0,0,0.06)",
      "--border":         "rgba(0,0,0,0.12)",
      "--border-hover":   "rgba(0,0,0,0.20)",
      "--border-input":   "rgba(0,0,0,0.18)",
      "--border-focus":   "rgba(14,165,233,0.40)",
      "--text-primary":   "#1a1a1a",
      "--text-secondary": "#4a4a50",
      "--text-muted":     "#888890",
      "--text-ghost":     "#c8c8cc",
      "--accent":         "#0ea5e9",
      "--accent-muted":   "rgba(14,165,233,0.15)",
      "--scrollbar":      "rgba(0,0,0,0.15)",
    },
  },

  // ── Rose ─────────────────────────────────────────────────────────────────
  {
    id:       "rose",
    label:    "Rose",
    fontStack: "'Lato', 'Georgia', serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
    tokens: {
      "--font-body":      "'Lato', 'Georgia', serif",
      "--bg-app":         "#130b0d",
      "--bg-column":      "linear-gradient(180deg,#1a0f12 0%,#140b0e 100%)",
      "--bg-column-solid":"#160c0f",
      "--bg-card":        "#1d1114",
      "--bg-modal":       "#1f1316",
      "--bg-popover":     "#261619",
      "--bg-input":       "rgba(251,113,133,0.06)",
      "--border":         "rgba(251,113,133,0.12)",
      "--border-hover":   "rgba(251,113,133,0.22)",
      "--border-input":   "rgba(251,113,133,0.15)",
      "--border-focus":   "rgba(251,113,133,0.40)",
      "--text-primary":   "#f8e8ea",
      "--text-secondary": "#d49098",
      "--text-muted":     "#8a4a52",
      "--text-ghost":     "#5a2830",
      "--accent":         "#fb7185",
      "--accent-muted":   "rgba(251,113,133,0.20)",
      "--scrollbar":      "rgba(200,60,60,0.12)",
    },
  },
]

export const defaultTheme = themes[0]