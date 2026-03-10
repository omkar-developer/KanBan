// Drop anywhere in your settings panel or sidebar.
// import ThemePicker from "./theme/ThemePicker"

import { useTheme } from "./useTheme"
import type { Theme } from "./theme"

export default function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, themes } = useTheme()

  if (compact) {
    // Icon-only row of swatches
    return (
      <div className="flex gap-1.5 flex-wrap">
        {themes.map((t: Theme) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              theme.id === t.id ? "border-white/40 scale-110" : "border-transparent hover:border-white/20"
            }`}
            style={{ background: t.tokens["--bg-card"], outline: `2px solid ${t.tokens["--accent"]}40` }}
          >
            <span className="sr-only">{t.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
        Theme
      </p>
      <div className="flex flex-col gap-1.5">
        {themes.map((t: Theme) => {
          const active = theme.id === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
              style={{
                background: active ? "var(--border, rgba(255,255,255,0.06))" : "transparent",
                borderColor: active ? "rgba(255,255,255,0.14)" : t.tokens["--border"],
                color: active ? t.tokens["--text-primary"] : t.tokens["--text-muted"],
              }}
            >
              {/* 3-dot swatch */}
              <span className="flex gap-0.5 flex-shrink-0 items-center">
                {(["--bg-card","--bg-column-solid","--accent"] as const).map(v => (
                  <span
                    key={v}
                    className="w-3 h-3 rounded-full border"
                    style={{
                      background: t.tokens[v],
                      borderColor: t.tokens["--border"],
                    }}
                  />
                ))}
              </span>

              {/* Label */}
              <span className="text-xs font-medium flex-1">{t.label}</span>

              {/* Font preview */}
              <span
                className="text-[11px] opacity-50"
                style={{ fontFamily: t.fontStack }}
              >
                Aa
              </span>

              {/* Active tick */}
              {active && (
                <svg className="w-3 h-3 flex-shrink-0" style={{ color: t.tokens["--accent"] }}
                  viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}