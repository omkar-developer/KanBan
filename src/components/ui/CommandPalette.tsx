import { useEffect, useMemo, useRef, useState } from "react"
import { useKanbanStore } from "../../state/kanbanStore"
import { useUIStore } from "../../state/uiStore"
import { useTheme } from "../../theme/useTheme"
import { downloadBoardJSON, downloadDatabaseBackup } from "../../utils/exportImport"
import { Search, Plus, Palette, Download, HardDrive } from "lucide-react"

interface CommandPaletteProps {
  onSelectBoard?: (boardId: string | null, boardType?: "kanban" | "notes") => void
}

interface Action {
  id: string
  label: string
  hint?: string
  section: string
  keywords: string
  icon: React.ReactNode
  run: () => void
}

export default function CommandPalette({ onSelectBoard }: CommandPaletteProps) {
  const open = useUIStore(s => s.commandPaletteOpen)
  const close = useUIStore(s => s.closeCommandPalette)
  const openCreateBoard = useUIStore(s => s.openCreateBoard)

  const boards = useKanbanStore(s => s.boards)
  const tasks = useKanbanStore(s => s.tasks)
  const columns = useKanbanStore(s => s.columns)
  const activeBoardId = useKanbanStore(s => s.activeBoardId)

  const { theme, setTheme, themes } = useTheme()

  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const actions = useMemo<Action[]>(() => {
    const boardActions: Action[] = boards.map(b => ({
      id: `board-${b.id}`,
      label: b.name,
      hint: b.type === "notes" ? "Notes board" : "Board",
      section: "Boards",
      keywords: `open go navigate ${b.name} ${b.category ?? ""}`,
      icon: (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: b.color ?? "#3b82f6" }}
        />
      ),
      run: () => {
        onSelectBoard?.(b.id, b.type === "notes" ? "notes" : "kanban")
        close()
      },
    }))

    const utilityActions: Action[] = [
      {
        id: "create-board",
        label: "Create new board",
        hint: "New board",
        section: "Actions",
        keywords: "create new add board",
        icon: <Plus size={16} />,
        run: () => {
          openCreateBoard()
          close()
        },
      },
      {
        id: "theme",
        label: `Toggle theme (${theme.label})`,
        hint: themes.map(t => t.label).join(" / "),
        section: "Actions",
        keywords: "theme appearance dark light switch color",
        icon: <Palette size={16} />,
        run: () => {
          const currentIdx = themes.findIndex(t => t.id === theme.id)
          const next = themes[(currentIdx + 1) % themes.length]
          setTheme(next.id)
        },
      },
      {
        id: "export-board",
        label: "Export current board as JSON",
        hint: "Export",
        section: "Actions",
        keywords: "export json save backup download",
        icon: <Download size={16} />,
        run: async () => {
          const board = boards.find(b => b.id === activeBoardId)
          if (board) {
            const boardColumns = columns.filter(c => c.boardId === board.id)
            const boardTasks = tasks.filter(t => boardColumns.some(c => c.id === t.columnId))
            downloadBoardJSON(board, boardColumns, boardTasks)
          }
          close()
        },
      },
      {
        id: "backup",
        label: "Create database backup",
        hint: "Backup",
        section: "Actions",
        keywords: "backup database export all",
        icon: <HardDrive size={16} />,
        run: async () => {
          const s = useKanbanStore.getState()
          downloadDatabaseBackup(s.boards, s.columns, s.tasks, [])
          close()
        },
      },
    ]

    return [...boardActions, ...utilityActions]
  }, [boards, tasks, columns, activeBoardId, theme, themes, setTheme, onSelectBoard, openCreateBoard, close])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(a =>
      `${a.label} ${a.hint ?? ""} ${a.keywords}`.toLowerCase().includes(q)
    )
  }, [actions, query])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, close])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const runAction = (a: Action) => {
    a.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const a = filtered[activeIndex]
      if (a) runAction(a)
    }
  }

  const sections: { name: string; items: Action[] }[] = []
  for (const a of filtered) {
    const sec = sections.find(s => s.name === a.section)
    if (sec) sec.items.push(a)
    else sections.push({ name: a.section, items: [a] })
  }

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-modal)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search boards and commands…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: "var(--text-primary)" }}
          />
          <kbd className="text-[11px] px-1.5 py-0.5 rounded font-mono"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            ESC
          </kbd>
        </div>

        <div className="max-h-[40vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No results for “{query}”
            </div>
          )}

          {sections.map(sec => (
            <div key={sec.name}>
              <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}>
                {sec.name}
              </div>
              {sec.items.map(a => {
                flatIndex++
                const idx = flatIndex
                const selected = idx === activeIndex
                return (
                  <button
                    key={a.id}
                    onClick={() => runAction(a)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: selected ? "var(--bg-input)" : "transparent",
                    }}
                  >
                    <span className="flex-shrink-0" style={{ color: selected ? "var(--accent)" : "var(--text-secondary)" }}>
                      {a.icon}
                    </span>
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {a.label}
                    </span>
                    {a.hint && (
                      <span className="text-[11px] truncate max-w-[40%]" style={{ color: "var(--text-muted)" }}>
                        {a.hint}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}