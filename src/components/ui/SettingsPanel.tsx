import { useState } from "react"
import { createPortal } from "react-dom"
import { useSettingsStore } from "../../state/settingsStore"
import { useTheme } from "../../theme/useTheme"
import type { Theme } from "../../theme/theme"

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "appearance" | "cards" | "features" | "backups"

interface Props {
  isOpen: boolean
  onClose: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
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
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", color: "var(--text-primary)" }}>
          {label}
        </p>
        {hint && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{hint}</p>
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
      className="relative w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2"
      style={{
        backgroundColor: checked ? "var(--accent)" : "var(--bg-input)",
        transform: "scale(1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = checked ? "var(--accent-muted)" : "var(--bg-column-solid)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = checked ? "var(--accent)" : "var(--bg-input)"
        e.currentTarget.style.transform = "scale(1)"
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.9)"
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)"
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200"
        style={{
          backgroundColor: "#fff",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
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
        className="w-16 rounded-lg px-2 py-1 text-sm outline-none text-right [color-scheme:dark]"
        style={{
          fontFamily: "var(--font-body, system-ui, sans-serif)",
          backgroundColor: "var(--bg-input)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-focus)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)"
        }}
      />
      {suffix && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{suffix}</span>}
    </div>
  )
}

function ThemeCard({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-2 p-3 rounded-xl border transition-all text-left"
      style={{
        borderColor: active ? "var(--border-focus)" : "var(--border)",
        backgroundColor: active ? "var(--accent-muted)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-hover)"
          e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border)"
          e.currentTarget.style.backgroundColor = "transparent"
        }
      }}
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
          className="text-xs font-medium"
          style={{ fontFamily: theme.fontStack, color: "var(--text-primary)" }}
        >
          {theme.label}
        </span>
        {active && (
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--accent)" }}
          >
            <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Font name */}
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
          <Row label="Column top border" hint="Show colored top border on columns">
            <Toggle checked={ui.showColumnTopBorder} onChange={v => setUi({ showColumnTopBorder: v })} />
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
          <div className="rounded-xl border px-4 py-3 flex flex-col gap-3"
            style={{
              borderColor: "var(--border-focus)",
              backgroundColor: "var(--accent-muted)",
            }}>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Reset all settings to defaults? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { reset(); setConfirmReset(false) }}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent-muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)"
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                Reset everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition"
                style={{
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-input)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)"
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-2 rounded-xl text-sm border transition"
            style={{
              fontFamily: "var(--font-body, system-ui, sans-serif)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
              backgroundColor: "transparent",
              transform: "scale(1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)"
              e.currentTarget.style.color = "var(--accent)"
              e.currentTarget.style.borderColor = "var(--border-focus)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.transform = "scale(1)"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            Reset to defaults
          </button>
        )}
      </div>
    </div>
  )
}

function BackupsTab() {
  const { settings, update } = useSettingsStore()
  const { backups } = settings
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleChooseFolder() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog")
      const selectedPath = await open({ directory: true })
      if (selectedPath && typeof selectedPath === "string") {
        update({ backups: { ...backups, cloudBackupPath: selectedPath } })
      }
    } catch (err) {
      console.error("Failed to open folder picker:", err)
    }
  }

  async function handleRestoreFromCloud() {
    setIsRestoring(true)
    setRestoreResult(null)
    try {
      const { restoreFromCloudBackup } = await import("../../hooks/useAutoBackup")
      const success = await restoreFromCloudBackup()
      setRestoreResult({
        success,
        message: success
          ? "Database restored successfully. The app will now reload."
          : "Failed to restore from cloud backup. Make sure cloud backup is enabled and a folder is selected.",
      })
      if (success) {
        // Reload the app after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (err) {
      setRestoreResult({ success: false, message: "An error occurred during restore." })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Cloud Backup</SectionLabel>
        <div className="divide-y divide-white/[0.05]">
          <Row label="Enable Cloud Backup" hint="Backup database to cloud folder on app close">
            <Toggle
              checked={backups.cloudBackupEnabled}
              onChange={v => update({ backups: { ...backups, cloudBackupEnabled: v } })}
            />
          </Row>
        </div>
      </div>

      <div>
        <SectionLabel>Backup Folder</SectionLabel>
        <div className="rounded-xl border px-4 py-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)" }}>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Choose a folder in your cloud sync directory (OneDrive, Google Drive, Dropbox, etc.).
            The database will be copied here automatically when you close the app.
          </p>

          <button
            onClick={handleChooseFolder}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition mb-3"
            style={{
              fontFamily: "var(--font-body, system-ui, sans-serif)",
              backgroundColor: "var(--accent)",
              color: "#fff",
              transform: "scale(1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)"
              e.currentTarget.style.transform = "scale(1)"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            Choose Backup Folder
          </button>

          {backups.cloudBackupPath && (
            <div className="mt-2 p-2 rounded-lg text-xs" style={{ backgroundColor: "var(--bg-column-solid)" }}>
              <p className="truncate" style={{ color: "var(--text-muted)" }}>
                {backups.cloudBackupPath}
              </p>
            </div>
          )}

          {restoreResult && (
            <div
              className="mt-3 p-3 rounded-lg text-xs"
              style={{
                backgroundColor: restoreResult.success ? "var(--accent-muted)" : "var(--bg-column-solid)",
                color: restoreResult.success ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {restoreResult.message}
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionLabel>Restore</SectionLabel>
        <div className="rounded-xl border px-4 py-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)" }}>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Restore your local database from the cloud backup. This will replace all current data.
          </p>

          <button
            onClick={handleRestoreFromCloud}
            disabled={isRestoring || !backups.cloudBackupPath}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition"
            style={{
              fontFamily: "var(--font-body, system-ui, sans-serif)",
              backgroundColor: isRestoring || !backups.cloudBackupPath ? "var(--bg-column-solid)" : "var(--bg-card)",
              color: isRestoring || !backups.cloudBackupPath ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border)",
              transform: "scale(1)",
              opacity: isRestoring || !backups.cloudBackupPath ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isRestoring && backups.cloudBackupPath) {
                e.currentTarget.style.backgroundColor = "var(--accent-muted)"
                e.currentTarget.style.color = "var(--accent)"
                e.currentTarget.style.borderColor = "var(--border-focus)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isRestoring && backups.cloudBackupPath) {
                e.currentTarget.style.backgroundColor = "var(--bg-card)"
                e.currentTarget.style.color = "var(--text-primary)"
                e.currentTarget.style.borderColor = "var(--border)"
                e.currentTarget.style.transform = "scale(1)"
              }
            }}
            onMouseDown={(e) => {
              if (!isRestoring && backups.cloudBackupPath) {
                e.currentTarget.style.transform = "scale(0.98)"
              }
            }}
            onMouseUp={(e) => {
              if (!isRestoring && backups.cloudBackupPath) {
                e.currentTarget.style.transform = "scale(1)"
              }
            }}
          >
            {isRestoring ? "Restoring..." : "Restore From Cloud Backup"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "cards",      label: "Cards" },
  { id: "features",   label: "Features" },
  { id: "backups",    label: "Backups" },
]

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("appearance")

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-modal)", borderColor: "var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", color: "var(--text-muted)" }}
          >
            Settings
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition"
            style={{ color: "var(--text-muted)", backgroundColor: "transparent", transform: "scale(1)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-input)"
              e.currentTarget.style.color = "var(--text-primary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
              e.currentTarget.style.transform = "scale(1)"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.95)"
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
            aria-label="Close settings"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: "1px solid var(--border)", padding: "4px 4px 0" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-t-lg transition-colors"
              style={{
                fontFamily: "var(--font-body, system-ui, sans-serif)",
                color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                backgroundColor: "transparent",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = "var(--text-secondary)"
                }
              }}
              onMouseLeave={(e) => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = "var(--text-muted)"
                  e.currentTarget.style.transform = "scale(1)"
                }
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)"
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)"
              }}
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
          {tab === "backups"    && <BackupsTab />}
        </div>
      </div>
    </div>,
    document.body
  )
}