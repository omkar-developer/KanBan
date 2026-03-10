import { useState } from "react"
import { createPortal } from "react-dom"
import { useSettingsStore } from "../../state/settingsStore"
import { useTheme } from "../../theme/useTheme"
import type { Theme } from "../../theme/theme"

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "appearance" | "cards" | "features"

interface Props {
  isOpen: boolean
  onClose: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300" style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}>
          {label}
        </p>
        {hint && (
          <p className="text-[11px] text-zinc-600 mt-0.5">{hint}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 ${
        checked ? "bg-sky-500" : "bg-white/[0.1]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={e => {
          const parsed = parseInt(e.target.value, 10)
          if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed)
          }
        }}
        className="w-16 bg-white/[0.04] border border-white/[0.09] rounded-lg px-2 py-1 text-sm text-zinc-200 outline-none focus:border-white/25 text-right [color-scheme:dark]"
        style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
      />
      {suffix && <span className="text-xs text-zinc-600">{suffix}</span>}
    </div>
  )
}

function ThemeCard({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col gap-2 p-3 rounded-xl border transition-all text-left ${
        active
          ? "border-sky-500/50 bg-sky-500/[0.06]"
          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
      }`}
    >
      {/* Mini board preview */}
      <div
        className="w-full h-10 rounded-lg overflow-hidden flex gap-1 p-1.5"
        style={{ background: theme.tokens["--bg-app"] }}
      >
        {(["--bg-column-solid", "--bg-card", "--accent"] as const).map((token, i) => (
          <div
            key={i}
            className="rounded flex-1"
            style={{ background: theme.tokens[token], opacity: i === 2 ? 0.7 : 1 }}
          />
        ))}
      </div>

      {/* Label row */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium text-zinc-300"
          style={{ fontFamily: theme.fontStack }}
        >
          {theme.label}
        </span>
        {active && (
          <svg
            className="w-3.5 h-3.5 text-sky-400 flex-shrink-0"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Font name */}
      <span className="text-[10px] text-zinc-600">
        {theme.fontStack.split(",")[0].replace(/'/g, "")}
      </span>
    </button>
  )
}

// ── Tab content ───────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Theme</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {themes.map((t: Theme) => (
            <ThemeCard
              key={t.id}
              theme={t}
              active={theme.id === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CardsTab() {
  const { settings, update } = useSettingsStore()
  const ui = settings.ui

  function setUi(patch: Partial<typeof ui>) {
    update({ ui: { ...ui, ...patch } })
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Visibility</SectionLabel>
        <div className="divide-y divide-white/[0.05]">
          <Row label="Type label" hint="Show bug / feature / note badge">
            <Toggle checked={ui.showTypeLabel} onChange={v => setUi({ showTypeLabel: v })} />
          </Row>
          <Row label="Priority badge">
            <Toggle checked={ui.showPriority} onChange={v => setUi({ showPriority: v })} />
          </Row>
          <Row label="Tags">
            <Toggle checked={ui.showTags} onChange={v => setUi({ showTags: v })} />
          </Row>
          <Row label="Due date">
            <Toggle checked={ui.showDueDate} onChange={v => setUi({ showDueDate: v })} />
          </Row>
          <Row label="Comment count">
            <Toggle checked={ui.showCommentCount} onChange={v => setUi({ showCommentCount: v })} />
          </Row>
          <Row label="Attachments">
            <Toggle checked={ui.showAttachments} onChange={v => setUi({ showAttachments: v })} />
          </Row>
          <Row label="Aging stripe" hint="Right-edge colour that deepens as a card gets old">
            <Toggle checked={ui.showAgingStripe} onChange={v => setUi({ showAgingStripe: v })} />
          </Row>
        </div>
      </div>

      <div>
        <SectionLabel>Description</SectionLabel>
        <Row
          label="Preview length"
          hint="Characters shown before 'Show more'"
        >
          <NumberInput
            value={ui.maxCardDescriptionPreview}
            min={80}
            max={1000}
            step={40}
            onChange={v => setUi({ maxCardDescriptionPreview: v })}
            suffix="chars"
          />
        </Row>
      </div>
    </div>
  )
}

function FeaturesTab() {
  const { settings, update, reset } = useSettingsStore()
  const { features, thresholds } = settings
  const [confirmReset, setConfirmReset] = useState(false)

  function setFeatures(patch: Partial<typeof features>) {
    update({ features: { ...features, ...patch } })
  }

  function setThresholds(patch: Partial<typeof thresholds>) {
    update({ thresholds: { ...thresholds, ...patch } })
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Features</SectionLabel>
        <div className="divide-y divide-white/[0.05]">
          <Row label="Card aging" hint="Tint old cards to surface neglected work">
            <Toggle
              checked={features.cardAging}
              onChange={v => setFeatures({ cardAging: v })}
            />
          </Row>
          <Row label="Due-date colours" hint="Amber when due soon, red when overdue">
            <Toggle
              checked={features.dueDateColors}
              onChange={v => setFeatures({ dueDateColors: v })}
            />
          </Row>
          <Row label="Keyboard shortcuts">
            <Toggle
              checked={features.keyboardShortcuts}
              onChange={v => setFeatures({ keyboardShortcuts: v })}
            />
          </Row>
        </div>
      </div>

      <div>
        <SectionLabel>Thresholds</SectionLabel>
        <div className="divide-y divide-white/[0.05]">
          <Row label="Aging warning" hint="Days before amber stripe appears">
            <NumberInput
              value={thresholds.agingWarningDays}
              min={1}
              max={30}
              onChange={v => setThresholds({ agingWarningDays: v })}
              suffix="days"
            />
          </Row>
          <Row label="Aging critical" hint="Days before red stripe appears">
            <NumberInput
              value={thresholds.agingCriticalDays}
              min={2}
              max={90}
              onChange={v => setThresholds({ agingCriticalDays: v })}
              suffix="days"
            />
          </Row>
          <Row label="Due soon" hint="Hours before due-date badge turns amber">
            <NumberInput
              value={thresholds.dueSoonHours}
              min={1}
              max={168}
              onChange={v => setThresholds({ dueSoonHours: v })}
              suffix="hours"
            />
          </Row>
        </div>
      </div>

      <div>
        <SectionLabel>Reset</SectionLabel>
        {confirmReset ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-rose-300">
              Reset all settings to defaults? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { reset(); setConfirmReset(false) }}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition"
              >
                Reset everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-2 rounded-xl text-sm text-zinc-600 border border-white/[0.06] hover:bg-rose-500/[0.06] hover:text-rose-400 hover:border-rose-500/20 transition"
            style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
          >
            Reset to defaults
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "cards",      label: "Cards" },
  { id: "features",   label: "Features" },
]

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("appearance")

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.09] shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-modal, #161616)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <span
            className="text-xs font-semibold text-zinc-600 uppercase tracking-widest"
            style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
          >
            Settings
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition"
            aria-label="Close settings"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/[0.06] flex-shrink-0 px-1 pt-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? "text-zinc-200 border-b-2 border-sky-500"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
              style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto flex-1 px-5 py-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]"
        >
          {tab === "appearance" && <AppearanceTab />}
          {tab === "cards"      && <CardsTab />}
          {tab === "features"   && <FeaturesTab />}
        </div>
      </div>
    </div>,
    document.body
  )
}