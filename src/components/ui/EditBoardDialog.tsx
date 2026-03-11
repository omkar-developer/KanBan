import { useState, useEffect } from 'react'
import Modal from './Modal'
import type { Board } from '../../models/Board'
import {
  Circle, Square, Bookmark, Star, Zap, Flame, Lightbulb, Rocket,
  Bug, Wrench, ClipboardList, LayoutList, Inbox, Pencil, FileText,
  Code2, GitBranch, Database, Server, Cloud, Link, Clock, Calendar,
  CheckCircle, BookOpen, Target, Pin, Sparkles, Coffee, Layers, Hammer
} from "lucide-react"

interface EditBoardDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (board: Partial<Board>) => Promise<void>
  board: Board
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

export default function EditBoardDialog({
  isOpen,
  onClose,
  onConfirm,
  board,
}: EditBoardDialogProps) {
  const [name, setName] = useState(board.name)
  const [icon, setIcon] = useState(board.icon || "circle")
  const [color, setColor] = useState(board.color || "#3b82f6")
  const [iconTab, setIconTab] = useState<"icon" | "color">("icon")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(board.name)
      setIcon(board.icon || "circle")
      setColor(board.color || "#3b82f6")
    }
  }, [isOpen, board])

  const handleSubmit = async () => {
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onConfirm({
        ...board,
        name: name.trim(),
        icon,
        color,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Board">
      <div className="space-y-4">
        {/* Board Name */}
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Board Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter board name..."
            className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
            style={{ color: "var(--text-primary)", backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--border-focus)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)"
            }}
            autoFocus
          />
        </div>

        {/* Icon Selection */}
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Icon & Color</label>
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setIconTab("icon")}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition"
              style={{
                backgroundColor: iconTab === "icon" ? "var(--bg-input)" : "transparent",
                color: iconTab === "icon" ? "var(--text-primary)" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                if (iconTab !== "icon") {
                  e.currentTarget.style.color = "var(--text-secondary)"
                }
              }}
              onMouseLeave={(e) => {
                if (iconTab !== "icon") {
                  e.currentTarget.style.color = "var(--text-muted)"
                }
              }}
            >
              Icon
            </button>
            <button
              onClick={() => setIconTab("color")}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition"
              style={{
                backgroundColor: iconTab === "color" ? "var(--bg-input)" : "transparent",
                color: iconTab === "color" ? "var(--text-primary)" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                if (iconTab !== "color") {
                  e.currentTarget.style.color = "var(--text-secondary)"
                }
              }}
              onMouseLeave={(e) => {
                if (iconTab !== "color") {
                  e.currentTarget.style.color = "var(--text-muted)"
                }
              }}
            >
              Color
            </button>
          </div>

          {iconTab === "icon" ? (
            <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto p-2 rounded-lg border"
              style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
              {ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon
                return (
                  <button
                    key={opt.id}
                    onClick={() => setIcon(opt.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition hover:bg-white/[0.08]"
                    style={{
                      backgroundColor: icon === opt.id ? "var(--bg-input)" : "transparent",
                    }}
                    title={opt.id}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-input)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = icon === opt.id ? "var(--bg-input)" : "transparent"
                    }}
                  >
                    <IconComponent width={16} height={16} style={{ color: icon === opt.id ? color : "var(--text-muted)" }} />
                    <span className="text-[8px] truncate w-full text-center" style={{ color: "var(--text-muted)" }}>{opt.id}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border"
              style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition"
                  style={{
                    backgroundColor: color === c.value ? "var(--bg-input)" : "transparent",
                    color: color === c.value ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    if (color !== c.value) {
                      e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
                      e.currentTarget.style.color = "var(--text-secondary)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (color !== c.value) {
                      e.currentTarget.style.backgroundColor = "transparent"
                      e.currentTarget.style.color = "var(--text-muted)"
                    }
                  }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: (!name.trim() || isSubmitting) ? "var(--bg-input)" : "var(--accent)",
            color: (!name.trim() || isSubmitting) ? "var(--text-muted)" : "#fff",
            transform: "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (name.trim() && !isSubmitting) {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)"
            }
          }}
          onMouseLeave={(e) => {
            if (name.trim() && !isSubmitting) {
              e.currentTarget.style.backgroundColor = "var(--accent)"
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
          onMouseDown={(e) => {
            if (name.trim() && !isSubmitting) {
              e.currentTarget.style.transform = "scale(0.98)"
            }
          }}
          onMouseUp={(e) => {
            if (name.trim() && !isSubmitting) {
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", transform: "scale(1)" }}
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
    </Modal>
  )
}
