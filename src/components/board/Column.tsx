import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Droppable, Draggable } from "@hello-pangea/dnd"
import type {
  DroppableProvided, DroppableStateSnapshot,
  DraggableProvided, DraggableStateSnapshot,
} from "@hello-pangea/dnd"

import {
  Circle, Square, Bookmark, Star, Zap, Flame, Lightbulb, Rocket,
  Bug, Wrench, ClipboardList, Eye, CheckCircle, BookOpen, Pin, Target,
  Leaf, Sparkles, Dice5, Pencil, Inbox, LayoutList, ShieldAlert, Coffee,
  Layers, Hammer, FileEdit, FileText, FileCode, Code2, GitBranch,
  GitCommit, GitMerge, GitPullRequest, Terminal, Package, Database,
  Server, Cloud, Plug, Link, Clock, Calendar, Search, Filter,
  CheckSquare, FlaskConical, Cpu
} from "lucide-react"

import type { Column as ColumnType } from "../../models/Column"
import type { Task, TaskPriority, TaskType } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import { useSettingsStore } from "../../state/settingsStore"
import TaskCard from "./TaskCard"
import TaskModal from "../task/TaskModal"
import DropdownMenu from "../ui/DropdownMenu"
import ConfirmDialog from "../ui/ConfirmDialog"
import { parseQuickAdd, hasQuickAddSyntax } from "../../utils/quickAddParser"

// ── Icon registry ─────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  circle: Circle, square: Square, bookmark: Bookmark, star: Star, pin: Pin, target: Target,
  lightbulb: Lightbulb, sparkles: Sparkles, rocket: Rocket, bug: Bug, shield: ShieldAlert,
  wrench: Wrench, tools: Hammer, clipboard: ClipboardList, list: LayoutList, inbox: Inbox,
  pencil: Pencil, edit: FileEdit, file: FileText, eye: Eye, search: Search, filter: Filter,
  check: CheckCircle, checkSquare: CheckSquare, book: BookOpen, docs: FileCode, code: Code2,
  branch: GitBranch, commit: GitCommit, merge: GitMerge, pull: GitPullRequest, terminal: Terminal,
  package: Package, layers: Layers, database: Database, server: Server, cloud: Cloud,
  api: Plug, link: Link, clock: Clock, calendar: Calendar, flame: Flame, zap: Zap,
  leaf: Leaf, coffee: Coffee, dice: Dice5, flask: FlaskConical, cpu: Cpu
}
const ICON_OPTIONS = Object.keys(ICON_MAP)

const defaultIconMap: Record<string, string> = {
  todo: "circle", backlog: "inbox", inprogress: "zap", "in progress": "zap",
  review: "eye", done: "check", bug: "bug", feature: "sparkles",
}
const getDefaultIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(defaultIconMap)) {
    if (lower.includes(key)) return icon
  }
  return "circle"
}

function ColumnIcon({ name, color, size = 16 }: { name: string; color: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Circle
  return <Icon width={size} height={size} style={{ color }} strokeWidth={1.75} />
}

const COLOR_OPTIONS = [
  { label: "Zinc",    value: "#71717a" }, { label: "Slate",   value: "#64748b" },
  { label: "Sky",     value: "#38bdf8" }, { label: "Blue",    value: "#3b82f6" },
  { label: "Emerald", value: "#34d399" }, { label: "Green",   value: "#22c55e" },
  { label: "Amber",   value: "#fbbf24" }, { label: "Orange",  value: "#fb923c" },
  { label: "Rose",    value: "#fb7185" }, { label: "Red",     value: "#ef4444" },
  { label: "Violet",  value: "#a78bfa" }, { label: "Pink",    value: "#f472b6" },
]

type SortKey = "order" | "title" | "priority" | "dueDate" | "createdAt"
type SortDir = "asc" | "desc"
type FilterP = TaskPriority | "all"
type FilterT = TaskType | "all"
const priorityWeight: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }

interface Props {
  column: ColumnType
  tasks: Task[]       // already sorted by order, passed from BoardView
  index: number       // column index for Draggable
}

export default function Column({ column, tasks, index }: Props) {
  const updateColumn = useKanbanStore(s => s.updateColumn)
  const deleteColumn = useKanbanStore(s => s.deleteColumn)
  const createTask   = useKanbanStore(s => s.createTask)
  const updateTask   = useKanbanStore(s => s.updateTask)
  const showColumnTopBorder = useSettingsStore(s => s.settings.ui.showColumnTopBorder)

  const [icon,           setIcon]           = useState(() => column.icon  ?? getDefaultIcon(column.name))
  const [iconColor,      setIconColor]      = useState(() => column.color ?? COLOR_OPTIONS[0].value)
  const [collapsed,      setCollapsed]      = useState(() => column.hidden ?? false)
  const [width,          setWidth]          = useState(() => column.width ?? 1)
  const [showIconPanel,  setShowIconPanel]  = useState(false)
  const [colorTab,       setColorTab]       = useState(false)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [quickTitle,     setQuickTitle]     = useState("")
  const [quickFocused,   setQuickFocused]   = useState(false)
  const [panelPosition,  setPanelPosition]  = useState({ top: 0, left: 0 })

  // Icon panel styling with CSS variables
  const iconPanelStyle = {
    background: 'var(--bg-popover, #1c1c1c)',
    border: '1px solid var(--border, rgba(255,255,255,0.06))',
  }
  const [sortKey,        setSortKey]        = useState<SortKey>(() => (column.sortKey as SortKey) || "order")
  const [sortDir,        setSortDir]        = useState<SortDir>(() => (column.sortDir as SortDir) || "asc")
  const [isEditingTitle, setIsEditingTitle]  = useState(false)
  const [tempTitle,      setTempTitle]       = useState(column.name)
  const [filterPriority, setFilterPriority] = useState<FilterP>(() => (column.filterPriority as FilterP) || "all")
  const [filterType,     setFilterType]     = useState<FilterT>(() => (column.filterType as FilterT) || "all")
  const [newTask,        setNewTask]        = useState<Task | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Persist column state changes to database
  const saveColumnState = (updates: Partial<ColumnType>) => {
    updateColumn({ ...column, ...updates })
  }

  const saveAppearance = (ic: string, color: string, hidden?: boolean, w?: number) =>
    saveColumnState({ icon: ic, color, hidden: hidden ?? collapsed, width: w ?? width })

  // Save sort/filter state when changed
  useEffect(() => {
    saveColumnState({ sortKey, sortDir, filterPriority, filterType })
  }, [sortKey, sortDir, filterPriority, filterType])

  const isFiltered = filterPriority !== "all" || filterType !== "all"
  const isSorted   = sortKey !== "order"

  // Apply filter/sort on top of the order passed from BoardView
  const displayTasks = React.useMemo(() => {
    let list = tasks
    if (filterPriority !== "all") list = list.filter(t => (t.priority ?? "low") === filterPriority)
    if (filterType     !== "all") list = list.filter(t => (t.type     ?? "task") === filterType)
    if (sortKey !== "order") {
      list = [...list].sort((a, b) => {
        let cmp = 0
        switch (sortKey) {
          case "title":     cmp = a.title.localeCompare(b.title); break
          case "priority":  cmp = priorityWeight[b.priority ?? "low"] - priorityWeight[a.priority ?? "low"]; break
          case "dueDate":   cmp = (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity); break
          case "createdAt": cmp = a.createdAt - b.createdAt; break
        }
        return sortDir === "asc" ? cmp : -cmp
      })
    }
    return list
  }, [tasks, sortKey, sortDir, filterPriority, filterType])

  const quickInputRef = useRef<HTMLInputElement>(null)
  const iconBtnRef    = useRef<HTMLButtonElement>(null)
  const colMenuBtnRef = useRef<HTMLButtonElement>(null)
  const iconPanelRef  = useRef<HTMLDivElement>(null)

  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true)
    setTempTitle(column.name)
  }

  const saveTitle = async () => {
    const trimmed = tempTitle.trim()
    if (trimmed && trimmed !== column.name) {
      await updateColumn({ ...column, name: trimmed })
    }
    setIsEditingTitle(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        iconPanelRef.current && !iconPanelRef.current.contains(e.target as Node) &&
        iconBtnRef.current   && !iconBtnRef.current.contains(e.target as Node)
      ) setShowIconPanel(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (showIconPanel && iconBtnRef.current) {
      const rect = iconBtnRef.current.getBoundingClientRect()
      setPanelPosition({ top: rect.bottom + 6, left: rect.left })
    }
  }, [showIconPanel])

  const submitQuick = async () => {
    const input = quickTitle.trim()
    if (!input) return

    let title: string
    const extra: Partial<Task> = {}

    // Parse quick-add syntax if present
    if (hasQuickAddSyntax(input)) {
      const parsed = parseQuickAdd(input)
      title = parsed.title
      if (parsed.priority) extra.priority = parsed.priority
      if (parsed.tags.length > 0) extra.tags = parsed.tags
      if (parsed.dueDate) extra.dueDate = parsed.dueDate
    } else {
      title = input
    }

    // Don't create task if title is empty after parsing
    if (title.trim()) {
      await createTask(column.id, title, extra)
      setQuickTitle("")
    }
  }

  const openNewTaskModal = () => {
    const draft: Task = {
      id: crypto.randomUUID(),
      columnId: column.id,
      title: "",
      order: 0,
      createdAt: Date.now(),
      type: "task",
      priority: "low",
    }
    setNewTask(draft)
  }

  const sortItem = (key: SortKey, label: string) => ({
    label: `${sortKey === key ? (sortDir === "asc" ? "↑ " : "↓ ") : "  "}${label}`,
    onClick: () => {
      if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
      else { setSortKey(key); setSortDir("asc") }
    },
  })

  const columnMenuItems = [
    {
      label: collapsed ? "Expand column" : "Collapse column",
      icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={collapsed ? "M3 9l4-4 4 4" : "M3 5l4 4 4-4"} strokeLinecap="round" /></svg>,
      onClick: () => { const next = !collapsed; setCollapsed(next); saveAppearance(icon, iconColor, next) }
    },
    { separator: true } as const,
    { label: "Sort by", onClick: () => {}, disabled: true },
    sortItem("order", "Default order"),
    sortItem("title", "Title A–Z"),
    sortItem("priority", "Priority"),
    sortItem("dueDate", "Due date"),
    sortItem("createdAt", "Date created"),
    { separator: true } as const,
    { label: "Filter priority", onClick: () => {}, disabled: true },
    ...(["all","low","medium","high","critical"] as const).map(p => ({
      label: `${filterPriority === p ? "✓ " : "  "}${p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}`,
      onClick: () => setFilterPriority(p)
    })),
    { separator: true } as const,
    { label: "Filter type", onClick: () => {}, disabled: true },
    ...(["all","task","feature","bug","note","checklist"] as const).map(t => ({
      label: `${filterType === t ? "✓ " : "  "}${t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}`,
      onClick: () => setFilterType(t)
    })),
    { separator: true } as const,
    { label: "Column width", onClick: () => {}, disabled: true },
    ...([1, 1.5, 2] as const).map(w => ({
      label: `${width === w ? "✓ " : "  "}${w}x`,
      onClick: () => { setWidth(w); saveAppearance(icon, iconColor, collapsed, w) }
    })),
    { separator: true } as const,
    {
      label: "Delete column", danger: true,
      icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      onClick: () => setShowDeleteConfirm(true)
    },
  ]

  // ── Collapsed pill ────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      // Still needs to be a Draggable so column reordering works when collapsed
      <Draggable draggableId={column.id} index={index}>
        {(provided: DraggableProvided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => { setCollapsed(false); saveAppearance(icon, iconColor, false) }}
            className="flex-shrink-0 flex flex-col items-center py-5 px-3 gap-3 rounded-2xl cursor-pointer transition hover:bg-white/[0.03]"
            style={{
              ...provided.draggableProps.style,
              border: `1px solid var(--border, rgba(255,255,255,0.06))`,
              background: `var(--bg-column-solid, #121212)`,
              width: 52,
            }}
            title={`Expand "${column.name}"`}
          >
            <ColumnIcon name={icon} color={iconColor} size={18} />
            <span className="text-[10px] text-zinc-600 font-medium select-none"
              style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif", transform: "rotate(180deg)" }}>
              {column.name}
            </span>
            <span className="text-[10px] text-[var(--text-muted,#666670)] bg-white/[0.04] border border-[var(--border,rgba(255,255,255,0.06))] px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
        )}
      </Draggable>
    )
  }

  // ── Full column ───────────────────────────────────────────────────────────
  return (
  <>
    <Draggable draggableId={column.id} index={index}>
      {(colProvided: DraggableProvided, colSnapshot: DraggableStateSnapshot) => (
        <div
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
          className="flex flex-col rounded-2xl transition-all"
          style={{
            ...colProvided.draggableProps.style,
            width: `${300 * width}px`,
            background: `var(--bg-column, linear-gradient(180deg,#161616 0%,#111 100%))`,
            border: `1px solid var(--border, rgba(255,255,255,0.06))`,
            borderTop: showColumnTopBorder ? `3px solid ${iconColor}` : `1px solid var(--border, rgba(255,255,255,0.06))`,
            boxShadow: colSnapshot.isDragging
              ? "0 24px 48px rgba(0,0,0,0.7)"
              : "0 8px 32px rgba(0,0,0,0.4)",
            opacity: colSnapshot.isDragging ? 0.95 : 1,
          }}
        >
          {/* Header — drag handle for column reordering ONLY */}
          <div
            /* drag handle is ONLY the header */
            {...colProvided.dragHandleProps}
            className="px-4 pt-4 pb-3 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  ref={iconBtnRef}
                  onClick={e => { e.stopPropagation(); setShowIconPanel(v => !v); setColorTab(false) }}
                  onPointerDown={e => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition flex-shrink-0"
                  title="Change icon / color"
                >
                  <ColumnIcon name={icon} color={iconColor} size={15} />
                </button>

                {/* Icon/color picker portalled to body — escapes ALL stacking contexts */}
                {showIconPanel && createPortal(
                  <div
                    ref={iconPanelRef}
                    className="rounded-xl border border-white/[0.09] shadow-2xl p-3"
                    style={{ position: "fixed", zIndex: 99999, background: "var(--bg-popover, #1c1c1c)", width: 280, top: panelPosition.top, left: panelPosition.left }}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <div className="flex gap-1 mb-3">
                      {(["Icon","Color"] as const).map(tab => (
                        <button key={tab} onPointerDown={e => e.stopPropagation()} onClick={() => setColorTab(tab === "Color")}
                          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition ${colorTab === (tab === "Color") ? "bg-white/[0.08] text-[var(--text-primary,#f0f0f0)]" : "text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)]"}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    {!colorTab ? (
                      <div className="grid grid-cols-6 gap-1">
                        {ICON_OPTIONS.map(id => (
                          <button key={id} onPointerDown={e => e.stopPropagation()}
                            onClick={() => { setIcon(id); saveAppearance(id, iconColor); setShowIconPanel(false) }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition hover:bg-white/[0.08] ${id === icon ? "bg-white/[0.1]" : ""}`} title={id}>
                            <ColumnIcon name={id} color={id === icon ? iconColor : "#52525b"} size={16} />
                            <span className="text-[9px] text-zinc-600 truncate w-full text-center leading-none">{id}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {COLOR_OPTIONS.map(c => (
                          <button key={c.value} onPointerDown={e => e.stopPropagation()}
                            onClick={() => { setIconColor(c.value); saveAppearance(icon, c.value); setShowIconPanel(false) }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition hover:bg-white/[0.06] ${iconColor === c.value ? "bg-white/[0.08] text-[var(--text-primary,#f0f0f0)]" : "text-[var(--text-secondary,#a8a8b0)]"}`}>
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>,
                  document.body
                )}

                {isEditingTitle ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle()
                      if (e.key === "Escape") {
                        setIsEditingTitle(false)
                        setTempTitle(column.name)
                      }
                    }}
                    autoFocus
                    className="font-semibold text-[var(--text-primary,#f0f0f0)] text-sm bg-white/[0.08] border border-white/[0.2] rounded px-2 py-1 w-full outline-none"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                ) : (
                  <h3
                    onDoubleClick={handleTitleDoubleClick}
                    className="font-semibold text-[var(--text-primary,#f0f0f0)] text-sm tracking-tight truncate cursor-pointer hover:bg-white/[0.06] rounded px-1 -mx-1 py-0.5 transition"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    title="Double-click to edit"
                  >
                    {column.name}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={e => e.stopPropagation()}>
                <span className="text-[11px] font-semibold text-[var(--text-secondary,#a8a8b0)] bg-white/[0.05] border border-[var(--border,rgba(255,255,255,0.06))] px-2 py-0.5 rounded-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {tasks.length}{isFiltered && <span className="ml-0.5 text-amber-500">*</span>}
                </span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={openNewTaskModal}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition" title="New task (full editor)">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10" strokeLinecap="round" /></svg>
                </button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { const next = !collapsed; setCollapsed(next); saveAppearance(icon, iconColor, next) }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition" title={collapsed ? "Expand column" : "Collapse column"}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={collapsed ? "M3 9l4-4 4 4" : "M3 5l4 4 4-4"} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  ref={colMenuBtnRef}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setShowColumnMenu(v => !v)}
                  className={`w-6 h-6 flex items-center justify-center rounded-lg transition ${showColumnMenu || isFiltered || isSorted ? "text-[var(--text-primary,#f0f0f0)] bg-white/[0.06]" : "text-[var(--text-muted,#666670)] hover:text-[var(--text-primary,#f0f0f0)] hover:bg-white/[0.06]"}`}>
                  <svg className="w-3 h-3" viewBox="0 0 4 14" fill="currentColor">
                    <circle cx="2" cy="2"  r="1.5" />
                    <circle cx="2" cy="7"  r="1.5" />
                    <circle cx="2" cy="12" r="1.5" />
                  </svg>
                </button>
                {showColumnMenu && (
                  <DropdownMenu
                    items={columnMenuItems}
                    onClose={() => setShowColumnMenu(false)}
                    anchorRef={colMenuBtnRef as React.RefObject<HTMLElement>}
                    align="right"
                  />
                )}
              </div>
            </div>

            {(isFiltered || isSorted) && (
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                {isSorted && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-[var(--text-secondary,#a8a8b0)] border border-[var(--border,rgba(255,255,255,0.06))]">{sortKey} {sortDir === "asc" ? "↑" : "↓"}</span>}
                {filterPriority !== "all" && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500/80 border border-amber-500/20">{filterPriority}</span>}
                {filterType     !== "all" && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-500/80 border border-sky-500/20">{filterType}</span>}
                <button onClick={() => { setFilterPriority("all"); setFilterType("all"); setSortKey("order"); setSortDir("asc") }}
                  className="text-[10px] text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] transition ml-auto">Clear ✕</button>
              </div>
            )}

            <div className="mt-3 h-px bg-white/[0.05]" />
          </div>

          {/* Task list — Droppable for card reordering + cross-column drops */}
          <Droppable droppableId={column.id} type="TASK">
            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2 min-h-[60px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent] transition-colors"
                style={{
                  background: snapshot.isDraggingOver ? "rgba(255,255,255,0.02)" : "transparent",
                  minHeight: 60,
                }}
              >
                {displayTasks.length > 0 ? (
                  displayTasks.map((task, taskIndex) => (
                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                      {(taskProvided: DraggableProvided, taskSnapshot: DraggableStateSnapshot) => (
                        <div
                          ref={taskProvided.innerRef}
                          {...taskProvided.draggableProps}
                          {...taskProvided.dragHandleProps}
                          style={{
                            ...taskProvided.draggableProps.style,
                            opacity:   taskSnapshot.isDragging ? 1 : 1,
                            transform: taskSnapshot.isDragging
                              ? `${taskProvided.draggableProps.style?.transform ?? ""} rotate(1.5deg) scale(1.02)`
                              : taskProvided.draggableProps.style?.transform,
                            boxShadow: taskSnapshot.isDragging
                              ? "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)"
                              : undefined,
                            borderRadius: 12,
                            zIndex: taskSnapshot.isDragging ? 9999 : undefined,
                          }}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div className={`flex flex-col items-center justify-center py-12 gap-2 rounded-xl border-2 border-dashed transition-colors ${snapshot.isDraggingOver ? "border-white/20" : "border-white/[0.06]"}`}>
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-[var(--border,rgba(255,255,255,0.06))] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--text-muted,#666670)]" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v10M2 7h10" strokeLinecap="round" /></svg>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted,#666670)] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Drop here</p>
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Quick add */}
          <div className="px-3 pb-3 pt-1">
            {quickFocused ? (
              <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] overflow-hidden">
                <input
                  ref={quickInputRef}
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  { e.preventDefault(); submitQuick() }
                    if (e.key === "Escape") { setQuickTitle(""); setQuickFocused(false) }
                  }}
                  onBlur={() => { if (!quickTitle.trim()) setQuickFocused(false) }}
                  placeholder="Quick task title…"
                  className="w-full bg-transparent text-sm text-[var(--text-primary,#f0f0f0)] placeholder-[var(--text-muted,#666670)] px-3 py-2.5 outline-none caret-zinc-400"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <div className="flex items-center gap-1.5 px-3 pb-2.5">
                  <button onMouseDown={e => { e.preventDefault(); submitQuick() }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.08] text-[var(--text-primary,#f0f0f0)] hover:bg-white/[0.13] hover:text-white transition">Add</button>
                  <button onMouseDown={e => { e.preventDefault(); setQuickTitle(""); setQuickFocused(false) }}
                    className="text-[11px] font-medium px-2 py-1 rounded-lg text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] transition">Cancel</button>
                  <button onMouseDown={e => { e.preventDefault(); setQuickFocused(false); setQuickTitle(""); openNewTaskModal() }}
                    className="ml-auto text-[11px] font-medium px-2 py-1 rounded-lg text-[var(--text-muted,#666670)] hover:text-sky-400 transition">
                    Full editor ↗
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setQuickFocused(true); setTimeout(() => quickInputRef.current?.focus(), 50) }}
                className="w-full flex items-center gap-2 py-2 px-2.5 rounded-xl text-[12px] font-medium text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] hover:bg-white/[0.04] transition-all"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M7 2v10M2 7h10" strokeLinecap="round" /></svg>
                Add task
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>

    {/* New task modal — portalled outside column stacking context */}
    {newTask && createPortal(
      <TaskModal
        task={newTask}
        isOpen={true}
        onClose={() => setNewTask(null)}
        onSave={async (_id, updates) => {
          if (!updates.title?.trim()) return
          await createTask(column.id, updates.title, updates)
          setNewTask(null)
        }}
        onDelete={async () => setNewTask(null)}
        isCreating
      />,
      document.body
    )}

    {/* Delete column confirmation dialog */}
    <ConfirmDialog
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={() => {
        deleteColumn(column.id)
        setShowDeleteConfirm(false)
      }}
      title="Delete Column"
      message={`Are you sure you want to delete "${column.name}"? This will also delete all ${tasks.length} task${tasks.length !== 1 ? 's' : ''} in this column.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
    />
  </>
  )
}