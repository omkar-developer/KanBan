// ── ThemeProvider ─────────────────────────────────────────────────────────────
// Wrap your <App /> once:
//   import { ThemeProvider } from "./theme/ThemeProvider"
//   <ThemeProvider><App /></ThemeProvider>
//
// Access theme anywhere inside:
//   import { useTheme } from "./theme/ThemeProvider"
//   const { theme, setTheme, themes } = useTheme()

import React, { useEffect, useState } from "react"
import { themes, defaultTheme, type Theme } from "./theme"
import { Ctx } from "./context"

const loadedFonts = new Set<string>()

function applyTheme(t: Theme) {
  const root = document.documentElement

  // Set font-family directly (also in tokens but we want it on body too)
  root.style.fontFamily = t.fontStack

  // Inject CSS variable tokens
  for (const [key, val] of Object.entries(t.tokens)) {
    root.style.setProperty(key, val)
  }

  // Load Google Font lazily — only if browser is online and font not yet loaded
  if (t.fontUrl && navigator.onLine && !loadedFonts.has(t.id)) {
    loadedFonts.add(t.id)
    const link  = document.createElement("link")
    link.rel    = "stylesheet"
    link.href   = t.fontUrl
    // Non-blocking: if it fails (offline later), the system fallback in fontStack kicks in
    link.onerror = () => loadedFonts.delete(t.id)
    document.head.appendChild(link)
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("kanban-theme")
      return themes.find(t => t.id === saved) ?? defaultTheme
    } catch { return defaultTheme }
  })

  // Apply on mount and whenever theme changes
  useEffect(() => { applyTheme(theme) }, [theme])

  const setTheme = (id: string) => {
    const t = themes.find(th => th.id === id)
    if (!t) return
    setThemeState(t)
    try { localStorage.setItem("kanban-theme", id) } catch { /* */ }
  }

  return <Ctx.Provider value={{ theme, setTheme, themes }}>{children}</Ctx.Provider>
}

export default ThemeProvider