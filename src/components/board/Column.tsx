import { useState, useRef, useEffect } from 'react'
import type { Column as ColumnType } from "../../models/Column"
import { useKanbanStore } from "../../state/kanbanStore"
import TaskCard from "./TaskCard"

interface Props {
  column: ColumnType
}

// Icon picker options
const ICON_OPTIONS = [
  "◇", "◈", "◉", "◎", "⊙", "❋", "✦", "◆",
  "📋", "🚀", "👀", "✅", "📚", "📌", "⚡", "🔥",
  "💡", "🎯", "🔧", "📝", "🌿", "⭐", "🔮", "🎲",
]

const defaultIconMap: Record<string, string> = {
  todo: "◇",
  backlog: "⊙",
  inprogress: "◈",
  "in progress": "◈",
  review: "◎",
  done: "◉",
}

const getDefaultIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(defaultIconMap)) {
    if (lower.includes(key)) return icon
  }
  return "◇"
}

export default function Column({ column }: Props) {
  const tasks = useKanbanStore(s => s.tasks)
  const createTask = useKanbanStore(s => s.createTask)

  const [quickTitle, setQuickTitle] = useState("")
  const [quickFocused, setQuickFocused] = useState(false)
  const [icon, setIcon] = useState(() => getDefaultIcon(column.name))
  const [showIconPicker, setShowIconPicker] = useState(false)
  const iconPickerRef = useRef<HTMLDivElement>(null)
  const quickInputRef = useRef<HTMLInputElement>(null)

  const columnTasks = tasks
    .filter(t => t.columnId === column.id)
    .sort((a, b) => a.order - b.order)

  const submitQuick = async () => {
    const trimmed = quickTitle.trim()
    if (!trimmed) return
    await createTask(column.id, trimmed)
    setQuickTitle("")
  }

  // Close icon picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div
      className="flex-shrink-0 w-[300px] flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #161616 0%, #111111 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">

            {/* Icon button — click to open picker */}
            <div className="relative flex-shrink-0" ref={iconPickerRef}>
              <button
                onClick={() => setShowIconPicker(v => !v)}
                className="text-base leading-none text-zinc-400 hover:text-zinc-200 transition w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06]"
                title="Change icon"
              >
                {icon}
              </button>

              {showIconPicker && (
                <div
                  className="absolute top-full left-0 mt-1.5 z-50 rounded-xl border border-white/[0.09] shadow-2xl p-2 grid grid-cols-8 gap-0.5"
                  style={{ background: "#1c1c1c", minWidth: 220 }}
                >
                  {ICON_OPTIONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => { setIcon(ic); setShowIconPicker(false) }}
                      className={`text-base w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-white/[0.08] ${ic === icon ? "bg-white/[0.1] text-white" : "text-zinc-400"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h3
              className="font-semibold text-zinc-100 text-sm tracking-tight truncate"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {column.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Task count */}
            <span
              className="text-[11px] font-semibold text-zinc-500 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-full"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {columnTasks.length}
            </span>
            {/* + button in header */}
            <button
              onClick={() => { setQuickFocused(true); setTimeout(() => quickInputRef.current?.focus(), 50) }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition"
              title="Add task"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 2v10M2 7h10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-3 h-px bg-white/[0.05]" />
      </div>

      {/* ── Tasks ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2 min-h-0
        [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]"
      >
        {columnTasks.length > 0 ? (
          columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
              <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 2v10M2 7h10" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[11px] text-zinc-700 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              No tasks yet
            </p>
          </div>
        )}
      </div>

      {/* ── Quick add at bottom ── */}
      <div className="px-3 pb-3 pt-1">
        {quickFocused ? (
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] overflow-hidden">
            <input
              ref={quickInputRef}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); submitQuick() }
                if (e.key === "Escape") { setQuickTitle(""); setQuickFocused(false) }
              }}
              onBlur={() => { if (!quickTitle.trim()) setQuickFocused(false) }}
              placeholder="Task title..."
              className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2.5 outline-none caret-zinc-400"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            <div className="flex items-center gap-1.5 px-3 pb-2.5">
              <button
                onMouseDown={e => { e.preventDefault(); submitQuick() }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.08] text-zinc-300 hover:bg-white/[0.13] hover:text-white transition"
              >
                Add
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); setQuickTitle(""); setQuickFocused(false) }}
                className="text-[11px] font-medium px-2 py-1 rounded-lg text-zinc-600 hover:text-zinc-400 transition"
              >
                Cancel
              </button>
              <span className="ml-auto text-[10px] text-zinc-700">↵ add · Esc cancel</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setQuickFocused(true); setTimeout(() => quickInputRef.current?.focus(), 50) }}
            className="w-full flex items-center gap-2 py-2 px-2.5 rounded-xl text-[12px] font-medium text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.04] transition-all duration-150 group/add"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <svg className="w-3.5 h-3.5 group-hover/add:text-zinc-400 transition" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M7 2v10M2 7h10" strokeLinecap="round" />
            </svg>
            Add task
          </button>
        )}
      </div>
    </div>
  )
}