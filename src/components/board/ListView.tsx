import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Task, TaskPriority, TaskType } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import TagFilterUI from "../ui/TagFilterUI"
import TaskModal from "../task/TaskModal"

// ── Types ─────────────────────────────────────────────────────────────────────
type SortKey = "title" | "column" | "priority" | "type" | "createdAt" | "dueDate" | "updatedAt"
type SortDir = "asc" | "desc"

const PRIORITY_WEIGHT: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "rgba(239,68,68,0.1)",    text: "#ef4444", border: "rgba(239,68,68,0.25)",    dot: "#ef4444" },
  high:     { bg: "rgba(249,115,22,0.1)",   text: "#f97316", border: "rgba(249,115,22,0.25)",   dot: "#f97316" },
  medium:   { bg: "rgba(234,179,8,0.1)",    text: "#eab308", border: "rgba(234,179,8,0.25)",    dot: "#eab308" },
  low:      { bg: "rgba(113,113,122,0.1)",  text: "#71717a", border: "rgba(113,113,122,0.25)",  dot: "#71717a" },
}

const TYPE_ICONS: Record<string, string> = {
  task: "◇", feature: "✦", bug: "⚠", note: "📝", checklist: "☑",
}

function getTypeIcon(type?: string) { return TYPE_ICONS[type ?? "task"] ?? "◇" }

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 10 14">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 2v10M2 5l3-3 3 3M2 9l3 3 3-3" />
    </svg>
  )
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 10 10" style={{ color: "var(--accent, #60a5fa)" }}>
      {dir === "asc"
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 7l3-4 3 4" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 3l3 4 3-4" />
      }
    </svg>
  )
}

function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-500 flex-shrink-0"
      style={{ accentColor: "var(--accent, #60a5fa)" }}
    />
  )
}

interface DropdownProps {
  label: React.ReactNode
  children: React.ReactNode
  buttonStyle?: React.CSSProperties
  buttonClass?: string
  align?: "left" | "right"
}

function Dropdown({ label, children, buttonClass = "", buttonStyle, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={buttonClass}
        style={buttonStyle}
      >
        {label}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 min-w-[160px] rounded-xl border shadow-2xl py-1"
          style={{
            backgroundColor: "var(--bg-popover, #1c1c1c)",
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            [align === "right" ? "right" : "left"]: 0,
            top: "100%",
          }}
        >
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
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition hover:bg-white/[0.05]"
      style={{
        color: danger ? "#ef4444" : active ? "var(--accent, #60a5fa)" : "var(--text-secondary, #a8a8b0)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {active && !danger && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
      {(!active || danger) && <span className="w-1.5 h-1.5 flex-shrink-0" />}
      {children}
    </button>
  )
}

function DropSep() {
  return <div className="my-1 h-px" style={{ backgroundColor: "var(--border, rgba(255,255,255,0.06))" }} />
}

// ── Move-to-column dropdown (bulk or single) ──────────────────────────────────
function MoveToDropdown({
  label, buttonClass, buttonStyle, align = "left", onSelect
}: {
  label: React.ReactNode
  buttonClass?: string
  buttonStyle?: React.CSSProperties
  align?: "left" | "right"
  onSelect: (columnId: string) => void
}) {
  const columns = useKanbanStore(s => s.columns)
  const sorted = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])

  return (
    <Dropdown label={label} buttonClass={buttonClass} buttonStyle={buttonStyle} align={align}>
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted, #666670)" }}>
        Move to column
      </div>
      <DropSep />
      {sorted.map(col => (
        <DropItem key={col.id} onClick={() => onSelect(col.id)}>{col.name}</DropItem>
      ))}
    </Dropdown>
  )
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="rounded-2xl border p-6 w-80 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-card, #161616)",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
        }}
      >
        <p className="text-sm mb-5" style={{ color: "var(--text-primary, #f0f0f0)", fontFamily: "'DM Sans', sans-serif" }}>
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition hover:brightness-110"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition hover:bg-white/[0.08]"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Row action buttons (shown on hover) ───────────────────────────────────────
function RowActions({ task, onEdit, onArchive, onDelete, onMove }: {
  task: Task
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onMove: (columnId: string) => void
}) {
  const isArchived = (task.data?.archived as boolean) === true

  return (
    <div className="flex items-center gap-1">
      {/* Edit */}
      <button
        onClick={e => { e.stopPropagation(); onEdit() }}
        title="Edit task"
        className="p-1.5 rounded-lg transition hover:bg-white/[0.08]"
        style={{ color: "var(--text-muted)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z" />
        </svg>
      </button>

      {/* Move */}
      <div onClick={e => e.stopPropagation()}>
        <MoveToDropdown
          label={
            <span title="Move to column" className="p-1.5 rounded-lg flex items-center transition hover:bg-white/[0.08]"
              style={{ color: "var(--text-muted)" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M7 2v10M2 7l5-5 5 5" />
              </svg>
            </span>
          }
          align="right"
          onSelect={onMove}
        />
      </div>

      {/* Archive / Unarchive */}
      <button
        onClick={e => { e.stopPropagation(); onArchive() }}
        title={isArchived ? "Unarchive" : "Archive"}
        className="p-1.5 rounded-lg transition hover:bg-white/[0.08]"
        style={{ color: "var(--text-muted)" }}
      >
        {isArchived ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M2 7a5 5 0 1010 0A5 5 0 002 7zm5-2v4m-2-2h4" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M2 4h10M4 4V2.5h6V4M5 6.5v4M9 6.5v4M3 4l.75 7.5h6.5L11 4" />
          </svg>
        )}
      </button>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        title="Delete task"
        className="p-1.5 rounded-lg transition hover:bg-rose-500/20"
        style={{ color: "var(--text-muted)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Main ListView component ───────────────────────────────────────────────────
export default function ListView() {
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

  // ── Local state ──────────────────────────────────────────────────────────
  const [sortKey,          setSortKey]          = useState<SortKey>("createdAt")
  const [sortDir,          setSortDir]          = useState<SortDir>("desc")
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set())
  const [editingTask,      setEditingTask]      = useState<Task | null>(null)
  const [confirmDelete,    setConfirmDelete]    = useState<"single" | "bulk" | null>(null)
  const [deleteTargetId,   setDeleteTargetId]   = useState<string | null>(null)
  const [localSearch,      setLocalSearch]      = useState("")
  const [filterPriority,   setFilterPriority]   = useState<TaskPriority | "all">("all")
  const [filterType,       setFilterType]       = useState<TaskType | "all">("all")
  const [filterColumn,     setFilterColumn]     = useState<string | "all">("all")
  const [hoveredRow,       setHoveredRow]       = useState<string | null>(null)
  const [densityCompact,   setDensityCompact]   = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isArchived = (t: Task) => (t.data?.archived as boolean) === true

  const getColumnName = useCallback((columnId: string) => {
    return columns.find(c => c.id === columnId)?.name ?? "Unknown"
  }, [columns])

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns])

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const effectiveSearch = localSearch || searchQuery

    const result = tasks.filter(task => {
      if (!showArchived && isArchived(task)) return false
      if (activeTags.length > 0 && !task.tags?.some(t => activeTags.includes(t))) return false
      if (filterPriority !== "all" && (task.priority ?? "low") !== filterPriority) return false
      if (filterType !== "all" && (task.type ?? "task") !== filterType) return false
      if (filterColumn !== "all" && task.columnId !== filterColumn) return false

      if (effectiveSearch.trim()) {
        const q = effectiveSearch.toLowerCase()
        if (!(
          task.title.toLowerCase().includes(q) ||
          (task.description?.toLowerCase().includes(q)) ||
          task.tags?.some(t => t.toLowerCase().includes(q)) ||
          getColumnName(task.columnId).toLowerCase().includes(q)
        )) return false
      }
      return true
    })

    return result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "title":     cmp = a.title.localeCompare(b.title); break
        case "column":    cmp = getColumnName(a.columnId).localeCompare(getColumnName(b.columnId)); break
        case "priority":  cmp = (PRIORITY_WEIGHT[a.priority ?? "low"] ?? 0) - (PRIORITY_WEIGHT[b.priority ?? "low"] ?? 0); break
        case "type":      cmp = (a.type ?? "task").localeCompare(b.type ?? "task"); break
        case "createdAt": cmp = a.createdAt - b.createdAt; break
        case "dueDate":   cmp = (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity); break
        case "updatedAt": cmp = (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [tasks, activeTags, searchQuery, localSearch, showArchived, sortKey, sortDir, filterPriority, filterType, filterColumn, getColumnName])

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allSelected   = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.has(t.id))
  const someSelected  = filteredTasks.some(t => selectedIds.has(t.id)) && !allSelected
  const selectedCount = selectedIds.size

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredTasks.map(t => t.id)))
  }

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  // ── Single-task actions ───────────────────────────────────────────────────
  const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates)
    setEditingTask(null)
  }

  const handleSingleDelete = (taskId: string) => {
    setDeleteTargetId(taskId)
    setConfirmDelete("single")
  }

  const handleSingleArchive = async (task: Task) => {
    if (isArchived(task)) await unarchiveTask(task.id, task.columnId)
    else await archiveTask(task.id)
  }

  const handleSingleMove = async (task: Task, columnId: string) => {
    await updateTask(task.id, { columnId })
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const selectedTasks = useMemo(
    () => filteredTasks.filter(t => selectedIds.has(t.id)),
    [filteredTasks, selectedIds]
  )

  const handleBulkDelete = () => setConfirmDelete("bulk")

  const handleBulkArchive = async () => {
    const archivable = selectedTasks.filter(t => !isArchived(t))
    await Promise.all(archivable.map(t => archiveTask(t.id)))
    setSelectedIds(new Set())
  }

  const handleBulkUnarchive = async () => {
    const restorable = selectedTasks.filter(t => isArchived(t))
    await Promise.all(restorable.map(t => unarchiveTask(t.id, t.columnId)))
    setSelectedIds(new Set())
  }

  const handleBulkMove = async (columnId: string) => {
    await Promise.all(selectedTasks.map(t => updateTask(t.id, { columnId })))
    setSelectedIds(new Set())
  }

  const confirmDeleteAction = async () => {
    if (confirmDelete === "single" && deleteTargetId) {
      await deleteTask(deleteTargetId)
      setDeleteTargetId(null)
    } else if (confirmDelete === "bulk") {
      await Promise.all(selectedTasks.map(t => deleteTask(t.id)))
      setSelectedIds(new Set())
    }
    setConfirmDelete(null)
  }

  // ── Active filter check ───────────────────────────────────────────────────
  const hasActiveFilters = filterPriority !== "all" || filterType !== "all" || filterColumn !== "all" || localSearch.trim() !== ""

  const clearFilters = () => {
    setFilterPriority("all")
    setFilterType("all")
    setFilterColumn("all")
    setLocalSearch("")
  }

  // ── Shared button style ───────────────────────────────────────────────────
  const toolbarBtn = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border"
  const toolbarBtnStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-input, rgba(255,255,255,0.04))",
    border: "1px solid var(--border, rgba(255,255,255,0.08))",
    color: "var(--text-secondary, #a8a8b0)",
    fontFamily: "'DM Sans', sans-serif",
  }

  // ── Due date formatting ───────────────────────────────────────────────────
  const formatDate = (ts?: number) => {
    if (!ts) return null
    const d = new Date(ts)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / 86400000)
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    const overdue = days < 0
    const soon = days >= 0 && days <= 3
    return { label, overdue, soon }
  }

  // ── Column header component ───────────────────────────────────────────────
  const Th = ({ label, sortable, field, width }: {
    label: string; sortable?: boolean; field?: SortKey; width?: string
  }) => (
    <th
      className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest select-none ${sortable ? "cursor-pointer hover:text-[var(--text-secondary)]" : ""}`}
      style={{ color: "var(--text-muted)", width, fontFamily: "'DM Sans', sans-serif" }}
      onClick={() => sortable && field && handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortable && field && <SortIcon active={sortKey === field} dir={sortDir} />}
      </div>
    </th>
  )

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        minHeight: 0,
      }}
    >

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: "var(--bg-card, #161616)",
          border: "1px solid var(--border, rgba(255,255,255,0.06))",
        }}
      >
        {/* Local search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 14 14"
            style={{ color: "var(--text-muted)" }}>
            <circle cx="6" cy="6" r="4" strokeWidth={1.75} />
            <path d="M9.5 9.5l2.5 2.5" strokeLinecap="round" strokeWidth={1.75} />
          </svg>
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition"
            style={{
              backgroundColor: "var(--bg-input, rgba(255,255,255,0.04))",
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              color: "var(--text-primary)",
            }}
          />
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
        <Dropdown
          align="left"
          label={
            <span className={`${toolbarBtn} ${filterPriority !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`}
              style={toolbarBtnStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M2 4h10M4 7h6M6 10h2" />
              </svg>
              Priority
              {filterPriority !== "all" && (
                <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold"
                  style={{ backgroundColor: PRIORITY_STYLES[filterPriority]?.bg, color: PRIORITY_STYLES[filterPriority]?.text }}>
                  {filterPriority}
                </span>
              )}
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
        <Dropdown
          align="left"
          label={
            <span className={`${toolbarBtn} ${filterType !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`}
              style={toolbarBtnStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z" />
              </svg>
              Type
              {filterType !== "all" && (
                <span className="ml-0.5 text-[9px] font-bold">{getTypeIcon(filterType)} {filterType}</span>
              )}
            </span>
          }
        >
          {(["all", "task", "feature", "bug", "note", "checklist"] as const).map(t => (
            <DropItem key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              {t === "all" ? "All types" : <span>{getTypeIcon(t)} <span className="capitalize">{t}</span></span>}
            </DropItem>
          ))}
        </Dropdown>

        {/* Column filter */}
        <Dropdown
          align="left"
          label={
            <span className={`${toolbarBtn} ${filterColumn !== "all" ? "!border-blue-500/40 !text-blue-400" : ""}`}
              style={toolbarBtnStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M3 2h2v10H3zM6 2h2v10H6zM9 2h2v10H9z" />
              </svg>
              Column
              {filterColumn !== "all" && (
                <span className="ml-0.5 text-[9px] font-bold truncate max-w-[60px]">
                  {getColumnName(filterColumn)}
                </span>
              )}
            </span>
          }
        >
          <DropItem active={filterColumn === "all"} onClick={() => setFilterColumn("all")}>
            All columns
          </DropItem>
          <DropSep />
          {sortedColumns.map(col => (
            <DropItem key={col.id} active={filterColumn === col.id} onClick={() => setFilterColumn(col.id)}>
              {col.name}
            </DropItem>
          ))}
        </Dropdown>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition hover:bg-white/[0.08]"
            style={{ color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", backgroundColor: "rgba(249,115,22,0.08)" }}>
            Clear filters ✕
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Density toggle */}
        <button
          onClick={() => setDensityCompact(v => !v)}
          className={`${toolbarBtn}`}
          style={{ ...toolbarBtnStyle, ...(densityCompact ? { color: "var(--accent, #60a5fa)", borderColor: "rgba(96,165,250,0.3)" } : {}) }}
          title="Toggle compact density"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
            <path strokeLinecap="round" strokeWidth={1.75} d="M2 3h10M2 7h10M2 11h10" />
          </svg>
          {densityCompact ? "Compact" : "Normal"}
        </button>

        {/* Row count */}
        <span className="text-xs px-2.5 py-1.5 rounded-lg"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
          }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tag filter ────────────────────────────────────────────────────── */}
      <TagFilterUI
        allTags={[...new Set(tasks.flatMap(t => t.tags || []))].filter(Boolean)}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearTags={() => setActiveTags([])}
        taskCount={filteredTasks.length}
        totalCount={tasks.filter(t => showArchived || !isArchived(t)).length}
      />

      {/* ── Bulk action bar (shown when rows selected) ─────────────────────── */}
      {selectedCount > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: "rgba(96,165,250,0.08)",
            border: "1px solid rgba(96,165,250,0.2)",
          }}
        >
          <span className="text-xs font-semibold mr-1" style={{ color: "var(--accent, #60a5fa)" }}>
            {selectedCount} selected
          </span>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs px-2 py-1 rounded-lg transition hover:bg-white/[0.08]"
            style={{ color: "var(--text-muted)" }}>
            Deselect all
          </button>

          <div className="h-4 w-px mx-1" style={{ backgroundColor: "var(--border)" }} />

          {/* Bulk move */}
          <MoveToDropdown
            label={
              <span className={`${toolbarBtn} hover:brightness-110`} style={toolbarBtnStyle}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M7 2v10M2 7l5-5 5 5" />
                </svg>
                Move to…
              </span>
            }
            onSelect={handleBulkMove}
          />

          {/* Bulk archive */}
          {selectedTasks.some(t => !isArchived(t)) && (
            <button onClick={handleBulkArchive}
              className={`${toolbarBtn} hover:brightness-110`} style={toolbarBtnStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M2 4h10M4 4V2.5h6V4M5 6.5v4M9 6.5v4M3 4l.75 7.5h6.5L11 4" />
              </svg>
              Archive
            </button>
          )}

          {/* Bulk unarchive */}
          {selectedTasks.some(t => isArchived(t)) && (
            <button onClick={handleBulkUnarchive}
              className={`${toolbarBtn} hover:brightness-110`} style={toolbarBtnStyle}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M2 7a5 5 0 1010 0A5 5 0 002 7zm5-2v4m-2-2h4" />
              </svg>
              Unarchive
            </button>
          )}

          {/* Bulk delete */}
          <button onClick={handleBulkDelete}
            className={`${toolbarBtn} hover:brightness-110`}
            style={{ ...toolbarBtnStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M2 2l10 10M12 2L2 12" />
            </svg>
            Delete {selectedCount}
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {filteredTasks.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <svg className="mx-auto h-10 w-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No tasks found</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {hasActiveFilters ? "Try clearing some filters" : "Tasks will appear here"}
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Scrollable table region — thead stays sticky at top */}
          <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0 }}>
            <table className="min-w-full">
              <thead style={{
                backgroundColor: "var(--bg-column-solid, rgba(255,255,255,0.02))",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Checkbox */}
                  <th className="pl-4 pr-2 py-3 w-8">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <Th label="Task" sortable field="title" />
                  <Th label="Column" sortable field="column" width="130px" />
                  <Th label="Priority" sortable field="priority" width="110px" />
                  <Th label="Type" sortable field="type" width="100px" />
                  <Th label="Due" sortable field="dueDate" width="100px" />
                  <Th label="Updated" sortable field="updatedAt" width="110px" />
                  <Th label="Tags" width="180px" />
                  {/* Actions column */}
                  <th className="px-4 py-3 w-[140px]" />
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => {
                  const selected = selectedIds.has(task.id)
                  const archived = isArchived(task)
                  const due = formatDate(task.dueDate)
                  const isLast = i === filteredTasks.length - 1

                  return (
                    <tr
                      key={task.id}
                      onMouseEnter={() => setHoveredRow(task.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onDoubleClick={() => setEditingTask(task)}
                      style={{
                        backgroundColor: selected
                          ? "rgba(96,165,250,0.06)"
                          : hoveredRow === task.id
                            ? "rgba(255,255,255,0.025)"
                            : "transparent",
                        opacity: archived ? 0.55 : 1,
                        borderBottom: isLast ? "none" : "1px solid var(--border)",
                        cursor: "default",
                        transition: "background-color 0.1s",
                      }}
                    >
                      {/* Checkbox */}
                      <td className="pl-4 pr-2" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <Checkbox checked={selected} onChange={() => toggleRow(task.id)} />
                      </td>

                      {/* Title + description */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-sm flex-shrink-0">{getTypeIcon(task.type)}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                              {task.title}
                              {archived && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                  style={{ backgroundColor: "rgba(113,113,122,0.15)", color: "var(--text-muted)" }}>
                                  archived
                                </span>
                              )}
                            </p>
                            {!densityCompact && task.description && (
                              <p className="text-xs mt-0.5 line-clamp-1 max-w-md" style={{ color: "var(--text-muted)" }}>
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <span className="text-xs px-2 py-1 rounded-md"
                          style={{
                            color: "var(--text-secondary)",
                            backgroundColor: "var(--bg-input)",
                            border: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}>
                          {getColumnName(task.columnId)}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        {task.priority ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: PRIORITY_STYLES[task.priority]?.bg,
                              color: PRIORITY_STYLES[task.priority]?.text,
                              border: `1px solid ${PRIORITY_STYLES[task.priority]?.border}`,
                            }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PRIORITY_STYLES[task.priority]?.dot }} />
                            <span className="capitalize">{task.priority}</span>
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
                          {task.type ?? "task"}
                        </span>
                      </td>

                      {/* Due date */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        {due ? (
                          <span className="text-xs font-medium"
                            style={{
                              color: due.overdue ? "#ef4444" : due.soon ? "#f97316" : "var(--text-secondary)",
                            }}>
                            {due.overdue && "⚠ "}{due.label}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Updated */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {task.updatedAt
                            ? new Date(task.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                            : new Date(task.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                          }
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="px-4" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        {task.tags && task.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.slice(0, 3).map(tag => (
                              <span key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: "var(--bg-input)",
                                  color: "var(--text-secondary)",
                                  border: "1px solid var(--border)",
                                }}>
                                #{tag}
                              </span>
                            ))}
                            {task.tags.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{ color: "var(--text-muted)" }}>
                                +{task.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Row actions */}
                      <td className="px-3" style={{ paddingTop: densityCompact ? 8 : 14, paddingBottom: densityCompact ? 8 : 14 }}>
                        <div style={{ opacity: hoveredRow === task.id || selected ? 1 : 0, transition: "opacity 0.15s" }}>
                          <RowActions
                            task={task}
                            onEdit={() => setEditingTask(task)}
                            onArchive={() => handleSingleArchive(task)}
                            onDelete={() => handleSingleDelete(task.id)}
                            onMove={(colId) => handleSingleMove(task, colId)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>{/* end scroll region */}

          {/* Footer — sticky at bottom of the card, outside the scroll area */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{
              borderTop: "1px solid var(--border)",
              backgroundColor: "var(--bg-column-solid, rgba(255,255,255,0.02))",
              flexShrink: 0,
            }}
          >
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {selectedCount > 0 && ` · ${selectedCount} selected`}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Sorted by <span style={{ color: "var(--text-secondary)" }}>{sortKey}</span> {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>
      )}

      {/* ── Task editor modal ──────────────────────────────────────────────── */}
      {editingTask && createPortal(
        <TaskModal
          task={editingTask}
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSave={async (_id, updates) => handleSaveTask(editingTask.id, updates)}
          onDelete={async () => {
            handleSingleDelete(editingTask.id)
            setEditingTask(null)
          }}
        />,
        document.body
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmModal
          message={
            confirmDelete === "bulk"
              ? `Permanently delete ${selectedCount} task${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`
              : "Permanently delete this task? This cannot be undone."
          }
          onConfirm={confirmDeleteAction}
          onCancel={() => { setConfirmDelete(null); setDeleteTargetId(null) }}
        />
      )}
    </div>
  )
}