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
  // ── Default dark (Unchanged) ─────────────────────────────────────────────
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

  // ── Midnight (Fixed: Soft blue-grey text, reduced glare) ────────────────
  {
    id:       "midnight",
    label:    "Midnight",
    fontStack: "'Inter', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'Inter', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#0b0c18",
      "--bg-column":      "linear-gradient(180deg,#13152a 0%,#0e101f 100%)",
      "--bg-column-solid":"#11132a",
      "--bg-card":        "#161835",
      "--bg-modal":       "#181b3a",
      "--bg-popover":     "#1c2048",
      "--bg-input":       "rgba(129,140,248,0.08)",
      "--border":         "rgba(129,140,248,0.15)",
      "--border-hover":   "rgba(129,140,248,0.25)",
      "--border-input":   "rgba(129,140,248,0.20)",
      "--border-focus":   "rgba(129,140,248,0.50)",
      // Text is now a soft blue-grey instead of bright white/blue
      "--text-primary":   "#c8cde0",
      "--text-secondary": "#8891a8",
      "--text-muted":     "#5a6075",
      "--text-ghost":     "#2e3245",
      "--accent":         "#818cf8",
      "--accent-muted":   "rgba(129,140,248,0.25)",
      "--scrollbar":      "rgba(129,140,248,0.15)",
    },
  },

  // ── Forest (Fixed: Natural, muted green text, organic feel) ──────────────
  {
    id:       "forest",
    label:    "Forest",
    fontStack: "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#0d120d",
      "--bg-column":      "linear-gradient(180deg,#141a14 0%,#0e130e 100%)",
      "--bg-column-solid":"#121812",
      "--bg-card":        "#161e16",
      "--bg-modal":       "#1a221a",
      "--bg-popover":     "#1e281e",
      "--bg-input":       "rgba(74,222,128,0.08)",
      "--border":         "rgba(74,222,128,0.15)",
      "--border-hover":   "rgba(74,222,128,0.25)",
      "--border-input":   "rgba(74,222,128,0.20)",
      "--border-focus":   "rgba(74,222,128,0.50)",
      // Text is a soft sage/moss green, much easier on the eyes
      "--text-primary":   "#c8d8c8",
      "--text-secondary": "#8fa08b",
      "--text-muted":     "#5a6a58",
      "--text-ghost":     "#2e3a2e",
      "--accent":         "#4ade80",
      "--accent-muted":   "rgba(74,222,128,0.25)",
      "--scrollbar":      "rgba(74,222,128,0.15)",
    },
  },

  // ── Light (Fixed: Charcoal text, warmer paper-white backgrounds) ─────────
  {
    id:       "light",
    label:    "Light",
    fontStack: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    tokens: {
      "--font-body":      "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
      "--bg-app":         "#f8f8f8", // Softer than pure white
      "--bg-column":      "linear-gradient(180deg,#ffffff 0%,#f4f4f6 100%)",
      "--bg-column-solid":"#ffffff",
      "--bg-card":        "#ffffff",
      "--bg-modal":       "#ffffff",
      "--bg-popover":     "#ffffff",
      "--bg-input":       "rgba(0,0,0,0.06)",
      "--border":         "rgba(0,0,0,0.08)",
      "--border-hover":   "rgba(0,0,0,0.15)",
      "--border-input":   "rgba(0,0,0,0.12)",
      "--border-focus":   "rgba(14,165,233,0.40)",
      // Text is dark charcoal, not harsh black (#000)
      "--text-primary":   "#2a2a2a",
      "--text-secondary": "#555555",
      "--text-muted":     "#888888",
      "--text-ghost":     "#cccccc",
      "--accent":         "#0ea5e9",
      "--accent-muted":   "rgba(14,165,233,0.12)",
      "--scrollbar":      "rgba(0,0,0,0.12)",
    },
  },

  // ── Rose (Fixed: Dusty rose text, elegant and muted) ─────────────────────
  {
    id:       "rose",
    label:    "Rose",
    fontStack: "'Lato', 'Georgia', serif",
    fontUrl:  "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
    tokens: {
      "--font-body":      "'Lato', 'Georgia', serif",
      "--bg-app":         "#130b0d",
      "--bg-column":      "linear-gradient(180deg,#1a1012 0%,#140a0c 100%)",
      "--bg-column-solid":"#180e10",
      "--bg-card":        "#1e1316",
      "--bg-modal":       "#22181b",
      "--bg-popover":     "#281e21",
      "--bg-input":       "rgba(251,113,133,0.08)",
      "--border":         "rgba(251,113,133,0.15)",
      "--border-hover":   "rgba(251,113,133,0.25)",
      "--border-input":   "rgba(251,113,133,0.20)",
      "--border-focus":   "rgba(251,113,133,0.50)",
      // Text is dusty pink/mauve, very elegant
      "--text-primary":   "#d8c8ca",
      "--text-secondary": "#a88890",
      "--text-muted":     "#6a5055",
      "--text-ghost":     "#3a2830",
      "--accent":         "#fb7185",
      "--accent-muted":   "rgba(251,113,133,0.25)",
      "--scrollbar":      "rgba(200,60,60,0.15)",
    },
  },
]

export const defaultTheme = themes[0]