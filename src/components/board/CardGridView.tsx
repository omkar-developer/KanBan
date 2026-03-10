import { useMemo, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Task, TaskPriority, TaskType } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import TagFilterUI from "../ui/TagFilterUI"
import { tagColorClasses } from "../../utils/tagColors"
import TaskModal from "../task/TaskModal"

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", border: "rgba(239,68,68,0.3)",   dot: "#ef4444" },
  high:     { bg: "rgba(249,115,22,0.12)",  text: "#f97316", border: "rgba(249,115,22,0.3)",  dot: "#f97316" },
  medium:   { bg: "rgba(234,179,8,0.12)",   text: "#eab308", border: "rgba(234,179,8,0.3)",   dot: "#eab308" },
  low:      { bg: "rgba(113,113,122,0.12)", text: "#71717a", border: "rgba(113,113,122,0.3)", dot: "#71717a" },
}

const PRIORITY_WEIGHT: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

type SortKey = "title" | "priority" | "type" | "createdAt" | "dueDate" | "column"
type SortDir = "asc" | "desc"

function getTypeIcon(type?: string): string {
  switch (type) {
    case "note":      return "📝"
    case "bug":       return "🐛"
    case "feature":   return "✨"
    case "checklist": return "☑️"
    default:          return "📋"
  }
}

// ── Tiny shared components ────────────────────────────────────────────────────
function Dropdown({ label, children, align = "left", buttonClass = "", buttonStyle }: {
  label: React.ReactNode
  children: React.ReactNode
  align?: "left" | "right"
  buttonClass?: string
  buttonStyle?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className={buttonClass} style={buttonStyle}>{label}</button>
      {open && (
        <div className="absolute z-50 mt-1 min-w-[160px] rounded-xl py-1 shadow-2xl"
          style={{
            backgroundColor: "var(--bg-popover, #1c1c1c)",
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            [align === "right" ? "right" : "left"]: 0, top: "100%",
          }}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropItem({ onClick, active, children, danger }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition"
      style={{
        color: danger ? "#ef4444" : active ? "var(--accent, #60a5fa)" : "var(--text-secondary, #a8a8b0)",
        fontFamily: "'DM Sans', sans-serif",
        backgroundColor: "transparent",
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: active && !danger ? "var(--accent, #60a5fa)" : "transparent" }} />
      {children}
    </button>
  )
}

function DropSep() {
  return <div className="my-1 h-px" style={{ backgroundColor: "var(--border, rgba(255,255,255,0.06))" }} />
}

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl border p-6 w-80 shadow-2xl"
        style={{ backgroundColor: "var(--bg-card, #161616)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
        <p className="text-sm mb-5" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
          {message}
        </p>
        <div className="flex gap-2">
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)")}
          >Confirm</button>
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}
          >Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── MoveToDropdown ────────────────────────────────────────────────────────────
function MoveToDropdown({ onSelect, align = "right" }: {
  onSelect: (columnId: string) => void
  align?: "left" | "right"
}) {
  const columns = useKanbanStore(s => s.columns)
  const sorted = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])

  return (
    <Dropdown align={align}
      buttonClass="p-1.5 rounded-lg transition flex items-center"
      buttonStyle={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
      label={
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 2v10M2 7l5-5 5 5" />
        </svg>
      }
    >
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}>Move to</div>
      <DropSep />
      {sorted.map(col => <DropItem key={col.id} onClick={() => onSelect(col.id)}>{col.name}</DropItem>)}
    </Dropdown>
  )
}

import React from "react"

// ── Card component ─────────────────────────────────────────────────────────────
function TaskGridCard({
  task,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
  onMove,
  getColumnName,
}: {
  task: Task
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onMove: (columnId: string) => void
  getColumnName: (id: string) => string
}) {
  const [hovered, setHovered] = useState(false)
  const isArchived = (task.data?.archived as boolean) === true
  const ps = task.priority ? PRIORITY_STYLES[task.priority] : null

  const formatDate = (ts?: number) => {
    if (!ts) return null
    const d = new Date(ts)
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000)
    return {
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      overdue: diff < 0,
      soon: diff >= 0 && diff <= 3,
    }
  }

  const due = formatDate(task.dueDate)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onEdit}
      style={{
        backgroundColor: selected ? "rgba(96,165,250,0.07)" : "var(--bg-card)",
        border: selected
          ? "1px solid rgba(96,165,250,0.35)"
          : hovered
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        opacity: isArchived ? 0.6 : 1,
        transition: "border-color 0.15s, background-color 0.15s, box-shadow 0.15s, transform 0.15s",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.35)"
          : "0 1px 4px rgba(0,0,0,0.15)",
        transform: hovered ? "translateY(-1px)" : "none",
        cursor: "default",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
      }}
    >
      {/* Selection checkbox — top-left, fade in on hover/selected */}
      <div
        style={{
          position: "absolute", top: 12, left: 12,
          opacity: hovered || selected ? 1 : 0,
          transition: "opacity 0.15s",
        }}
        onClick={e => { e.stopPropagation(); onSelect() }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-3.5 h-3.5 rounded cursor-pointer"
          style={{ accentColor: "var(--accent, #60a5fa)" }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Header: type icon + priority badge */}
      <div className="flex items-start justify-between mb-3" style={{ paddingLeft: hovered || selected ? 20 : 0, transition: "padding 0.15s" }}>
        <span className="text-lg leading-none">{getTypeIcon(task.type)}</span>
        <div className="flex items-center gap-1.5">
          {isArchived && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ backgroundColor: "rgba(113,113,122,0.15)", color: "var(--text-muted)" }}>
              archived
            </span>
          )}
          {ps && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: ps.bg, color: ps.text, border: `1px solid ${ps.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ps.dot }} />
              <span className="capitalize">{task.priority}</span>
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold mb-1.5 line-clamp-2 leading-snug"
        style={{ color: "var(--text-primary)" }}>
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}>
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 4).map(tag => {
            const c = tagColorClasses(tag)
            return (
              <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${c.bg} ${c.border} ${c.text}`}>
                #{tag}
              </span>
            )
          })}
          {task.tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-input)" }}>
              +{task.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer: column + due date */}
      <div className="flex items-center justify-between text-[11px] mt-auto pt-1"
        style={{ borderTop: "1px solid var(--border)", marginTop: 8 }}>
        <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M2 4h10M2 4l1 8h8l1-8M5 4V2.5h4V4" />
          </svg>
          <span className="truncate max-w-[80px]">{getColumnName(task.columnId)}</span>
        </div>
        {due && (
          <span className="font-medium"
            style={{ color: due.overdue ? "#ef4444" : due.soon ? "#f97316" : "var(--text-muted)" }}>
            {due.overdue && "⚠ "}{due.label}
          </span>
        )}
      </div>

      {/* Hover action bar */}
      <div
        className="flex items-center gap-0.5 justify-end mt-2.5"
        style={{ opacity: hovered || selected ? 1 : 0, transition: "opacity 0.15s" }}
      >
        {/* Edit */}
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          title="Edit"
          className="p-1.5 rounded-lg transition"
          style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z" />
          </svg>
        </button>

        {/* Move */}
        <div onClick={e => e.stopPropagation()}>
          <MoveToDropdown onSelect={onMove} align="right" />
        </div>

        {/* Archive toggle */}
        <button onClick={e => { e.stopPropagation(); onArchive() }}
          title={isArchived ? "Unarchive" : "Archive"}
          className="p-1.5 rounded-lg transition"
          style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
        >
          {isArchived ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 2a5 5 0 100 10A5 5 0 007 2zm0 3v4m-2-2h4" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2 4h10M4 4V2.5h6V4M5 6.5v4M9 6.5v4M3 4l.75 7.5h6.5L11 4" />
            </svg>
          )}
        </button>

        {/* Delete */}
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          title="Delete"
          className="p-1.5 rounded-lg transition"
          style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#ef4444" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main CardGridView ─────────────────────────────────────────────────────────
export default function CardGridView() {
  const tasks         = useKanbanStore(s => s.tasks)
  const columns       = useKanbanStore(s => s.columns)
  const activeTags    = useKanbanStore(s => s.activeTags)
  const searchQuery   = useKanbanStore(s => s.searchQuery)
  const setActiveTags = useKanbanStore(s => s.setActiveTags)
  const toggleTag     = useKanbanStore(s => s.toggleTag)
  const showArchived  = useKanbanStore(s => s.showArchived)
  const updateTask    = useKanbanStore(s => s.updateTask)
  const deleteTask    = useKanbanStore(s => s.deleteTask)
  const archiveTask   = useKanbanStore(s => s.archiveTask)
  const unarchiveTask = useKanbanStore(s => s.unarchiveTask)

  const [sortKey,        setSortKey]        = useState<SortKey>("createdAt")
  const [sortDir,        setSortDir]        = useState<SortDir>("desc")
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())
  const [editingTask,    setEditingTask]    = useState<Task | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<"single" | "bulk" | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [localSearch,    setLocalSearch]    = useState("")
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all")
  const [filterType,     setFilterType]     = useState<TaskType | "all">("all")
  const [filterColumn,   setFilterColumn]   = useState<string | "all">("all")
  const [colCount,       setColCount]       = useState<2 | 3 | 4>(3)

  const isArchived = (t: Task) => (t.data?.archived as boolean) === true

  const getColumnName = useCallback((id: string) =>
    columns.find(c => c.id === id)?.name ?? "Unknown"
  , [columns])

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])

  const filteredTasks = useMemo(() => {
    const eff = localSearch || searchQuery
    const result = tasks.filter(task => {
      if (!showArchived && isArchived(task)) return false
      if (activeTags.length > 0 && !task.tags?.some(t => activeTags.includes(t))) return false
      if (filterPriority !== "all" && (task.priority ?? "low") !== filterPriority) return false
      if (filterType !== "all" && (task.type ?? "task") !== filterType) return false
      if (filterColumn !== "all" && task.columnId !== filterColumn) return false
      if (eff.trim()) {
        const q = eff.toLowerCase()
        if (!(task.title.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          task.tags?.some(t => t.toLowerCase().includes(q)) ||
          getColumnName(task.columnId).toLowerCase().includes(q))) return false
      }
      return true
    })
    return result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "title":     cmp = a.title.localeCompare(b.title); break
        case "priority":  cmp = (PRIORITY_WEIGHT[a.priority ?? "low"] ?? 0) - (PRIORITY_WEIGHT[b.priority ?? "low"] ?? 0); break
        case "type":      cmp = (a.type ?? "task").localeCompare(b.type ?? "task"); break
        case "createdAt": cmp = a.createdAt - b.createdAt; break
        case "dueDate":   cmp = (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity); break
        case "column":    cmp = getColumnName(a.columnId).localeCompare(getColumnName(b.columnId)); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [tasks, activeTags, searchQuery, localSearch, showArchived, sortKey, sortDir, filterPriority, filterType, filterColumn, getColumnName])

  // Selection
  const allSelected  = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.has(t.id))
  const someSelected = filteredTasks.some(t => selectedIds.has(t.id)) && !allSelected
  const selectedCount = selectedIds.size
  const selectedTasks = useMemo(() => filteredTasks.filter(t => selectedIds.has(t.id)), [filteredTasks, selectedIds])

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredTasks.map(t => t.id)))
  }

  const hasFilters = filterPriority !== "all" || filterType !== "all" || filterColumn !== "all" || localSearch.trim() !== ""

  // Actions
  const handleEdit = (task: Task) => setEditingTask(task)

  const handleArchive = async (task: Task) => {
    if (isArchived(task)) await unarchiveTask(task.id, task.columnId)
    else await archiveTask(task.id)
  }

  const handleMove = async (task: Task, columnId: string) => {
    await updateTask(task.id, { columnId })
  }

  const handleSingleDelete = (taskId: string) => {
    setDeleteTargetId(taskId); setConfirmDelete("single")
  }

  const confirmDeleteAction = async () => {
    if (confirmDelete === "single" && deleteTargetId) {
      await deleteTask(deleteTargetId); setDeleteTargetId(null)
    } else if (confirmDelete === "bulk") {
      await Promise.all(selectedTasks.map(t => deleteTask(t.id)))
      setSelectedIds(new Set())
    }
    setConfirmDelete(null)
  }

  const handleBulkArchive = async () => {
    await Promise.all(selectedTasks.filter(t => !isArchived(t)).map(t => archiveTask(t.id)))
    setSelectedIds(new Set())
  }

  const handleBulkUnarchive = async () => {
    await Promise.all(selectedTasks.filter(t => isArchived(t)).map(t => unarchiveTask(t.id, t.columnId)))
    setSelectedIds(new Set())
  }

  const handleBulkMove = async (columnId: string) => {
    await Promise.all(selectedTasks.map(t => updateTask(t.id, { columnId })))
    setSelectedIds(new Set())
  }

  const sortLabel = (k: SortKey) => {
    const labels: Record<SortKey, string> = {
      title: "Title", priority: "Priority", type: "Type",
      createdAt: "Created", dueDate: "Due date", column: "Column"
    }
    return labels[k]
  }

  const tbBtn = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border"
  const tbStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-input, rgba(255,255,255,0.04))",
    border: "1px solid var(--border, rgba(255,255,255,0.08))",
    color: "var(--text-secondary, #a8a8b0)",
    fontFamily: "'DM Sans', sans-serif",
  }

  const gridCols = { 2: "grid-cols-1 md:grid-cols-2", 3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }

  return (
    <div className="flex flex-col gap-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 14 14" style={{ color: "var(--text-muted)" }}>
            <circle cx="6" cy="6" r="4" strokeWidth={1.75} />
            <path d="M9.5 9.5l2.5 2.5" strokeLinecap="round" strokeWidth={1.75} />
          </svg>
          <input value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search cards…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition"
            style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          {localSearch && (
            <button onClick={() => setLocalSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition"
              style={{ color: "var(--text-muted)" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 10 10">
                <path strokeLinecap="round" strokeWidth={2} d="M1 1l8 8M9 1L1 9" />
              </svg>
            </button>
          )}
        </div>

        {/* Priority filter */}
        <Dropdown align="left"
          label={
            <span className={`${tbBtn} ${filterPriority !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`} style={tbStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2 4h10M4 7h6M6 10h2" />
              </svg>
              {filterPriority === "all" ? "Priority" : <span className="capitalize">{filterPriority}</span>}
            </span>
          }
        >
          {(["all", "critical", "high", "medium", "low"] as const).map(p => (
            <DropItem key={p} active={filterPriority === p} onClick={() => setFilterPriority(p)}>
              {p === "all" ? "All priorities" : <span className="capitalize">{p}</span>}
            </DropItem>
          ))}
        </Dropdown>

        {/* Type filter */}
        <Dropdown align="left"
          label={
            <span className={`${tbBtn} ${filterType !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`} style={tbStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z" />
              </svg>
              {filterType === "all" ? "Type" : <span className="capitalize">{filterType}</span>}
            </span>
          }
        >
          {(["all", "task", "feature", "bug", "note", "checklist"] as const).map(t => (
            <DropItem key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              {t === "all" ? "All types" : <span className="capitalize">{t}</span>}
            </DropItem>
          ))}
        </Dropdown>

        {/* Column filter */}
        <Dropdown align="left"
          label={
            <span className={`${tbBtn} ${filterColumn !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`} style={tbStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 2h2v10H3zM6 2h2v10H6zM9 2h2v10H9z" />
              </svg>
              {filterColumn === "all" ? "Column" : <span className="truncate max-w-[60px]">{getColumnName(filterColumn)}</span>}
            </span>
          }
        >
          <DropItem active={filterColumn === "all"} onClick={() => setFilterColumn("all")}>All columns</DropItem>
          <DropSep />
          {sortedColumns.map(col => (
            <DropItem key={col.id} active={filterColumn === col.id} onClick={() => setFilterColumn(col.id)}>
              {col.name}
            </DropItem>
          ))}
        </Dropdown>

        {/* Sort */}
        <Dropdown align="left"
          label={
            <span className={`${tbBtn}`} style={tbStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M2 3h10M2 7h7M2 11h4" />
              </svg>
              {sortLabel(sortKey)} {sortDir === "asc" ? "↑" : "↓"}
            </span>
          }
        >
          {(["createdAt", "title", "priority", "type", "dueDate", "column"] as SortKey[]).map(k => (
            <DropItem key={k} active={sortKey === k}
              onClick={() => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc") } }}>
              {sortLabel(k)} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </DropItem>
          ))}
        </Dropdown>

        {/* Clear filters */}
        {hasFilters && (
          <button onClick={() => { setFilterPriority("all"); setFilterType("all"); setFilterColumn("all"); setLocalSearch("") }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
            style={{ color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", backgroundColor: "rgba(249,115,22,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.08)")}
          >Clear ✕</button>
        )}

        <div className="flex-1" />

        {/* Select all */}
        <button onClick={toggleAll}
          className={`${tbBtn}`} style={tbStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}>
          <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }}
            onChange={() => {}} className="w-3.5 h-3.5 pointer-events-none"
            style={{ accentColor: "var(--accent, #60a5fa)" }} />
          {allSelected ? "Deselect all" : "Select all"}
        </button>

        {/* Grid columns */}
        <div className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-input)" }}>
          {([2, 3, 4] as const).map(n => (
            <button key={n} onClick={() => setColCount(n)}
              className="px-2.5 py-1.5 text-xs font-medium transition"
              style={{
                color: colCount === n ? "var(--text-primary)" : "var(--text-muted)",
                backgroundColor: colCount === n ? "rgba(255,255,255,0.1)" : "transparent",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => { if (colCount !== n) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)" }}
              onMouseLeave={e => { if (colCount !== n) e.currentTarget.style.backgroundColor = "transparent" }}
            >{n}</button>
          ))}
        </div>

        {/* Count */}
        <span className="text-xs px-2.5 py-1.5 rounded-lg"
          style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
          {filteredTasks.length} card{filteredTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tag filter */}
      <TagFilterUI
        allTags={[...new Set(tasks.flatMap(t => t.tags || []))].filter(Boolean)}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearTags={() => setActiveTags([])}
        taskCount={filteredTasks.length}
        totalCount={tasks.filter(t => showArchived || !isArchived(t)).length}
      />

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-wrap"
          style={{ backgroundColor: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <span className="text-xs font-semibold mr-1" style={{ color: "var(--accent, #60a5fa)" }}>
            {selectedCount} selected
          </span>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs px-2 py-1 rounded-lg transition hover:bg-white/[0.08]"
            style={{ color: "var(--text-muted)" }}>Deselect all</button>
          <div className="h-4 w-px mx-1" style={{ backgroundColor: "var(--border)" }} />

          {/* Bulk move */}
          <Dropdown align="left"
            label={
              <span className={`${tbBtn}`} style={tbStyle}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 2v10M2 7l5-5 5 5" />
                </svg>
                Move to…
              </span>
            }
          >
            {sortedColumns.map(col => (
              <DropItem key={col.id} onClick={() => handleBulkMove(col.id)}>{col.name}</DropItem>
            ))}
          </Dropdown>

          {selectedTasks.some(t => !isArchived(t)) && (
            <button onClick={handleBulkArchive} className={`${tbBtn}`} style={tbStyle}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}>
              Archive
            </button>
          )}
          {selectedTasks.some(t => isArchived(t)) && (
            <button onClick={handleBulkUnarchive} className={`${tbBtn}`} style={tbStyle}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}>
              Unarchive
            </button>
          )}
          <button onClick={() => setConfirmDelete("bulk")}
            className={`${tbBtn}`}
            style={{ ...tbStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}>
            Delete {selectedCount}
          </button>
        </div>
      )}

      {/* Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 rounded-xl"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No tasks found</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {hasFilters ? "Try clearing some filters" : "Tasks will appear here"}
          </p>
        </div>
      ) : (
        <div className={`grid ${gridCols[colCount]} gap-4`}>
          {filteredTasks.map(task => (
            <TaskGridCard
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onSelect={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev)
                  next.has(task.id) ? next.delete(task.id) : next.add(task.id)
                  return next
                })
              }}
              onEdit={() => handleEdit(task)}
              onArchive={() => handleArchive(task)}
              onDelete={() => handleSingleDelete(task.id)}
              onMove={(colId) => handleMove(task, colId)}
              getColumnName={getColumnName}
            />
          ))}
        </div>
      )}

      {/* Task editor modal */}
      {editingTask && createPortal(
        <TaskModal
          task={editingTask}
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSave={async (_id, updates) => { await updateTask(editingTask.id, updates); setEditingTask(null) }}
          onDelete={async () => { handleSingleDelete(editingTask.id); setEditingTask(null) }}
        />,
        document.body
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          message={confirmDelete === "bulk"
            ? `Permanently delete ${selectedCount} task${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`
            : "Permanently delete this task? This cannot be undone."}
          onConfirm={confirmDeleteAction}
          onCancel={() => { setConfirmDelete(null); setDeleteTargetId(null) }}
        />
      )}
    </div>
  )
}