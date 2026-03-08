import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import TaskModal from "../task/TaskModal"

interface Props {
  task: Task
}

const priorityMeta = {
  low:      { badge: "", accent: "bg-zinc-700", dot: "bg-zinc-500", show: false },
  medium:   { badge: "bg-sky-500/10 text-sky-400 border border-sky-500/25",      accent: "bg-sky-500",    dot: "bg-sky-400",    show: true },
  high:     { badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25", accent: "bg-amber-500",  dot: "bg-amber-400",  show: true },
  critical: { badge: "bg-rose-500/10 text-rose-400 border border-rose-500/25",   accent: "bg-rose-500",   dot: "bg-rose-400",   show: true },
}

export default function TaskCard({ task }: Props) {
  const updateTask = useKanbanStore(s => s.updateTask)
  const deleteTask = useKanbanStore(s => s.deleteTask)

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [desc, setDesc] = useState(task.description || "")
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const saveTitle = async () => {
    setEditingTitle(false)
    const trimmed = title.trim()
    if (!trimmed) { setTitle(task.title); return }
    if (trimmed !== task.title) await updateTask(task.id!, { ...task, title: trimmed })
  }

  const saveDesc = async () => {
    setEditingDesc(false)
    if (desc !== task.description) await updateTask(task.id!, { ...task, description: desc })
  }

  const priority = task.priority || "low"
  const meta = priorityMeta[priority]
  // Strip mode: title only, no description, low priority, no due date
  const isStrip = !task.description && !meta.show && !task.dueDate

  if (confirmDelete) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-[#1a1010] border border-rose-500/30 px-4 py-3">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500" />
        <p className="text-xs text-zinc-300 mb-3 pl-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Delete <span className="text-white font-semibold">"{task.title}"</span>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => deleteTask(task.id!)}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 border border-white/[0.07] hover:bg-white/[0.08] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`
          group relative rounded-xl overflow-hidden
          bg-[#141414] border border-white/[0.06]
          hover:border-white/[0.11] transition-all duration-150
        `}
      >
        {priority !== "low" && (
          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.accent}`} />
        )}

        {isStrip ? (
          /* ── Strip layout: single line with actions on hover ── */
          <div className="flex items-center pl-4 pr-2 py-2.5 gap-2">
            <h3
              onDoubleClick={() => setEditingTitle(true)}
              className="flex-1 min-w-0 text-sm font-medium text-zinc-300 truncate select-none"
              style={{ fontFamily: "'DM Sans', sans-serif", cursor: "default" }}
            >
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle() }
                    if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false) }
                  }}
                  className="w-full bg-white/[0.06] outline-none border border-white/20 rounded-md text-sm font-medium text-white px-2 py-0.5 focus:border-white/35 caret-white transition"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : task.title}
            </h3>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => setModalOpen(true)} className="text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] rounded-md p-1.5 transition" title="Edit">
                <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2l2.5 2.5L4 12.5H1.5V10L9.5 2z" strokeLinejoin="round" strokeLinecap="round" /></svg>
              </button>
              <button onClick={() => setConfirmDelete(true)} className="text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-md p-1.5 transition" title="Delete">
                <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        ) : (
          /* ── Full card layout ── */
          <div className="pl-5 pr-3 py-3.5 space-y-2.5">
            {/* Header */}
            <div className="flex items-start gap-2">
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle() }
                    if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false) }
                  }}
                  className="flex-1 min-w-0 bg-white/[0.06] outline-none border border-white/20 rounded-md text-sm font-semibold text-white px-2 py-1 focus:border-white/35 focus:ring-1 focus:ring-white/15 caret-white transition"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : (
                <h3
                  onDoubleClick={() => setEditingTitle(true)}
                  className="flex-1 min-w-0 text-sm font-semibold text-zinc-100 leading-snug line-clamp-3 select-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", cursor: "default" }}
                >
                  {task.title}
                </h3>
              )}
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                <button onClick={() => setModalOpen(true)} className="text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] rounded-md p-1.5 transition" title="Edit">
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2l2.5 2.5L4 12.5H1.5V10L9.5 2z" strokeLinejoin="round" strokeLinecap="round" /></svg>
                </button>
                <button onClick={() => setConfirmDelete(true)} className="text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-md p-1.5 transition" title="Delete">
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div onDoubleClick={() => !editingDesc && setEditingDesc(true)}>
                {editingDesc ? (
                  <textarea
                    autoFocus
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    onBlur={saveDesc}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveDesc() }
                      if (e.key === "Escape") { setDesc(task.description || ""); setEditingDesc(false) }
                    }}
                    rows={3}
                    placeholder="Shift+Enter for new line, Enter to save"
                    className="w-full bg-white/[0.06] border border-white/20 rounded-md text-xs text-zinc-300 px-2 py-1.5 resize-none outline-none focus:border-white/35 focus:ring-1 focus:ring-white/15 caret-white transition leading-relaxed placeholder-zinc-700"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                ) : (
                  <div
                    title="Double-click to edit"
                    className="text-xs text-zinc-500 leading-relaxed cursor-default prose prose-invert prose-sm max-w-none
                      [&_code]:bg-[#1e1e1e] [&_code]:text-emerald-400 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px]
                      [&_pre]:bg-[#1a1a1a] [&_pre]:border [&_pre]:border-white/[0.07] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mt-1.5
                      [&_pre_code]:bg-transparent [&_pre_code]:text-emerald-400 [&_pre_code]:p-0
                      hover:text-zinc-400 transition-colors"
                  >
                    <ReactMarkdown>{task.description}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {(meta.show || task.dueDate) && (
              <div className="flex items-center gap-2 pt-0.5">
                {meta.show && (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${meta.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </span>
                )}
                {task.dueDate && (
                  <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                      <path d="M4.5 1v2M9.5 1v2M1.5 6h11" strokeLinecap="round" />
                    </svg>
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <TaskModal
        task={task}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={updateTask}
        onDelete={deleteTask}
      />
    </>
  )
}