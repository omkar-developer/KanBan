import { createPortal } from "react-dom"
import React from "react"
import { useUIStore } from "../../state/uiStore"

// ── Shortcut group ────────────────────────────────────────────────────────────
function ShortcutGroup({ title, items }: { title: string; items: { label: string; keys: string }[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", borderRadius: 8,
            backgroundColor: "var(--bg-input)",
          }}>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
            <kbd style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600,
              backgroundColor: "var(--bg-column-solid)", color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "monospace",
            }}>
              {item.keys.split(" ").map((key, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: "var(--text-muted)", fontSize: 9 }}>+</span>}
                  {key}
                </React.Fragment>
              ))}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tips section ──────────────────────────────────────────────────────────────
function TipsSection() {
  const tips = [
    "Use the Command Palette to quickly navigate between boards and tasks.",
    "Drag and drop tasks between columns to update their status.",
    "Use tags to categorize and filter tasks across all views.",
    "The board supports both Kanban board and list/grid views.",
    "Your data is stored locally in the browser — use backup to stay safe.",
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
        Quick Tips
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tips.map((tip) => (
          <div key={tip} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "6px 10px", borderRadius: 8,
            backgroundColor: "var(--bg-input)",
          }}>
            <span style={{ color: "var(--accent)", fontSize: 12, flexShrink: 0, marginTop: 1 }}>
              •
            </span>
            <span className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main HelpWindow ───────────────────────────────────────────────────────────

export default function HelpWindow() {
  const helpOpen = useUIStore(s => s.helpOpen)
  const closeHelp = useUIStore(s => s.closeHelp)

  if (!helpOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.72)", backdropFilter: "blur(4px)" }}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === "Escape") closeHelp() }}
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
            Help & Shortcuts
          </span>
          <button
            onClick={closeHelp}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition"
            style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-input)"
              e.currentTarget.style.color = "var(--text-primary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
            aria-label="Close help"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto flex-1 px-5 py-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          <ShortcutGroup title="General" items={[
            { label: "Open command palette", keys: "⌘ K" },
            { label: "Search tasks", keys: "⌘ F" },
            { label: "Create new board", keys: "⌘ N" },
            { label: "Close panel", keys: "Esc" },
          ]} />

          <ShortcutGroup title="Task Management" items={[
            { label: "Open task editor", keys: "Click card" },
            { label: "Drag to move task", keys: "Drag" },
            { label: "Toggle archived view", keys: "Archived btn" },
            { label: "Filter by tags", keys: "Filter btn" },
          ]} />

          <ShortcutGroup title="Views" items={[
            { label: "Board view", keys: "Board" },
            { label: "Notes view", keys: "Notes" },
            { label: "List view", keys: "List" },
            { label: "Grid view", keys: "Grid" },
          ]} />

          <TipsSection />
        </div>
      </div>
    </div>,
    document.body
  )
}
