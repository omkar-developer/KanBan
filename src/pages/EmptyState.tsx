import { useState } from "react"
import { useKanbanStore } from "../state/kanbanStore"
import {
  Circle, Square, Bookmark, Star, Zap, Flame, Lightbulb, Rocket,
  Bug, Wrench, ClipboardList, LayoutList, Inbox, Pencil, FileText,
  Code2, GitBranch, Database, Server, Cloud, Link, Clock, Calendar,
  CheckCircle, BookOpen, Target, Pin, Sparkles, Coffee, Layers, Hammer
} from "lucide-react"

interface Props {
  onCreateBoard: (name: string, type: "kanban" | "notes" | "tools", category?: string, icon?: string, color?: string) => Promise<void>
}

const ICON_OPTIONS = [
  { id: "circle", icon: Circle },
  { id: "square", icon: Square },
  { id: "bookmark", icon: Bookmark },
  { id: "star", icon: Star },
  { id: "zap", icon: Zap },
  { id: "flame", icon: Flame },
  { id: "lightbulb", icon: Lightbulb },
  { id: "rocket", icon: Rocket },
  { id: "bug", icon: Bug },
  { id: "wrench", icon: Wrench },
  { id: "clipboard", icon: ClipboardList },
  { id: "list", icon: LayoutList },
  { id: "inbox", icon: Inbox },
  { id: "pencil", icon: Pencil },
  { id: "file", icon: FileText },
  { id: "code", icon: Code2 },
  { id: "branch", icon: GitBranch },
  { id: "database", icon: Database },
  { id: "server", icon: Server },
  { id: "cloud", icon: Cloud },
  { id: "link", icon: Link },
  { id: "clock", icon: Clock },
  { id: "calendar", icon: Calendar },
  { id: "check", icon: CheckCircle },
  { id: "book", icon: BookOpen },
  { id: "target", icon: Target },
  { id: "pin", icon: Pin },
  { id: "sparkles", icon: Sparkles },
  { id: "coffee", icon: Coffee },
  { id: "layers", icon: Layers },
  { id: "hammer", icon: Hammer },
]

const COLOR_OPTIONS = [
  { label: "Zinc", value: "#71717a" },
  { label: "Slate", value: "#64748b" },
  { label: "Sky", value: "#38bdf8" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Emerald", value: "#34d399" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#fbbf24" },
  { label: "Orange", value: "#fb923c" },
  { label: "Rose", value: "#fb7185" },
  { label: "Red", value: "#ef4444" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Pink", value: "#f472b6" },
]

export default function EmptyState({ onCreateBoard }: Props) {
  const [name, setName] = useState("")
  const [boardType, setBoardType] = useState<"kanban" | "notes">("kanban")
  const [category, setCategory] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("circle")
  const [selectedColor, setSelectedColor] = useState("#3b82f6")
  const [iconTab, setIconTab] = useState<"icon" | "color">("icon")

  const handleCreate = async () => {
    if (!name.trim()) return
    await onCreateBoard(name.trim(), boardType, category.trim() || undefined, selectedIcon, selectedColor)
    setName("")
    setCategory("")
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{ background: "var(--accent)" }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>TaskFlow</h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Create your first board to get started</p>
        </div>

        {/* Create Board Card */}
        <div className="rounded-2xl border p-8"
          style={{ 
            backgroundColor: "var(--bg-card)", 
            borderColor: "var(--border)" 
          }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Create Your First Board</h2>
          
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Board Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter board name..."
                className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
                style={{ 
                  backgroundColor: "var(--bg-input)", 
                  color: "var(--text-primary)",
                  borderColor: "var(--border)"
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>

            {/* Board Type */}
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Type</label>
              <div className="flex gap-2">
                {(["kanban", "notes"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBoardType(type)}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      boardType === type
                        ? 'text-white'
                        : 'bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                    style={{
                      backgroundColor: boardType === type ? "var(--accent)" : undefined,
                      color: boardType === type ? "#fff" : "var(--text-secondary)"
                    }}
                  >
                    {type === "kanban" ? "Kanban" : "Notes"}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Category (Optional)</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Work, Personal..."
                className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
                style={{ 
                  backgroundColor: "var(--bg-input)", 
                  color: "var(--text-primary)",
                  borderColor: "var(--border)"
                }}
              />
            </div>

            {/* Icon & Color */}
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Icon & Color</label>
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setIconTab("icon")}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition ${
                    iconTab === "icon" 
                      ? "bg-white/[0.08] text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Icon
                </button>
                <button
                  onClick={() => setIconTab("color")}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition ${
                    iconTab === "color" 
                      ? "bg-white/[0.08] text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Color
                </button>
              </div>

              {iconTab === "icon" ? (
                <div className="grid grid-cols-8 gap-1 p-2 rounded-lg border"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                  {ICON_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedIcon(opt.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition hover:bg-white/[0.08] ${
                          selectedIcon === opt.id ? "bg-white/[0.1]" : ""
                        }`}
                        title={opt.id}
                      >
                        <IconComponent width={18} height={18} style={{ color: selectedIcon === opt.id ? selectedColor : "var(--text-muted)" }} />
                        <span className="text-[8px] truncate w-full text-center" style={{ color: "var(--text-muted)" }}>{opt.id}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 p-2 rounded-lg border"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedColor(c.value)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition hover:bg-white/[0.06] ${
                        selectedColor === c.value ? "bg-white/[0.08] text-white" : "text-zinc-400"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full py-4 rounded-lg font-semibold transition-all mt-6"
              style={{
                backgroundColor: !name.trim() ? "var(--bg-input)" : "var(--accent)",
                color: !name.trim() ? "var(--text-muted)" : "#fff"
              }}
            >
              Create Board
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
