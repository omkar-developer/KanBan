import { useState } from "react"
import type { Task, TaskPriority, TaskType } from "../../models/Task"

interface Props {
  task: Task
  onSave: (updates: Partial<Task>) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}

const priorityOptions: {
  value: TaskPriority; label: string
  dot: string; bg: string; border: string; text: string
}[] = [
  { value: "low",      label: "Low",      dot: "bg-zinc-500",  bg: "bg-zinc-800",     border: "border-zinc-700",     text: "text-zinc-300" },
  { value: "medium",   label: "Medium",   dot: "bg-sky-400",   bg: "bg-sky-500/10",   border: "border-sky-500/30",   text: "text-sky-400"  },
  { value: "high",     label: "High",     dot: "bg-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  { value: "critical", label: "Critical", dot: "bg-rose-400",  bg: "bg-rose-500/10",  border: "border-rose-500/30",  text: "text-rose-400"  },
]

const typeOptions: { value: TaskType; label: string; icon: string }[] = [
  { value: "task",      label: "Task",      icon: "◇" },
  { value: "feature",   label: "Feature",   icon: "✦" },
  { value: "bug",       label: "Bug",       icon: "⚠" },
  { value: "note",      label: "Note",      icon: "📝" },
  { value: "checklist", label: "Checklist", icon: "☑" },
]

const inputClass = `
  w-full bg-white/[0.04] border border-white/[0.09] rounded-xl
  px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600
  outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10
  caret-zinc-300 transition-all leading-relaxed [color-scheme:dark]
`

export default function TaskEditor({ task, onSave, onCancel, onDelete }: Props) {
  const [title,    setTitle]    = useState(task.title)
  const [desc,     setDesc]     = useState(task.description || "")
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "low")
  const [type,     setType]     = useState<TaskType>(task.type || "task")
  const [tags,     setTags]     = useState<string[]>(task.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [dueDate,  setDueDate]  = useState<string>(() =>
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    await onSave({
      title:       title.trim(),
      description: desc.trim() || undefined,
      priority,
      type,
      tags:        tags.length > 0 ? tags : undefined,
      dueDate:     dueDate ? new Date(dueDate).getTime() : undefined,
    })
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (t && !tags.includes(t)) setTags(p => [...p, t])
    setTagInput("")
  }

  const L = "text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5 block"

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Type */}
      <div>
        <span className={L}>Type</span>
        <div className="flex gap-1.5 flex-wrap">
          {typeOptions.map(opt => (
            <button key={opt.value} onClick={() => setType(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition
                ${type === opt.value
                  ? "bg-white/[0.08] border-white/[0.15] text-zinc-200"
                  : "bg-transparent border-white/[0.06] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"}`}>
              <span className="text-[13px] leading-none">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <span className={L}>Title</span>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSave() } }}
          placeholder="Task title…" className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <span className={L}>Description</span>
        <textarea
          value={desc} onChange={e => setDesc(e.target.value)} rows={4}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave() } }}
          placeholder="Add details… (Shift+Enter for new line)"
          className={`${inputClass} resize-none`}
        />
        <p className="text-[10px] text-zinc-700 mt-1 pl-0.5">Markdown supported · Shift+Enter newline · Enter save</p>
      </div>

      {/* Priority */}
      <div>
        <span className={L}>Priority</span>
        <div className="flex gap-1.5">
          {priorityOptions.map(opt => (
            <button key={opt.value} onClick={() => setPriority(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                ${priority === opt.value
                  ? `${opt.bg} ${opt.border} ${opt.text}`
                  : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priority === opt.value ? opt.dot : "bg-zinc-700"}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <span className={L}>Tags</span>
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                #{tag}
                <button onClick={() => setTags(p => p.filter(t => t !== tag))}
                  className="text-zinc-600 hover:text-zinc-300 transition ml-0.5">✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
            placeholder="Add tag…" className={`${inputClass} py-2 text-xs flex-1`} />
          <button onClick={addTag} disabled={!tagInput.trim()}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.1] hover:text-zinc-200 disabled:opacity-25 disabled:pointer-events-none transition">
            Add
          </button>
        </div>
      </div>

      {/* Due date */}
      <div>
        <span className={L}>Due Date <span className="normal-case font-normal text-zinc-700 tracking-normal">(optional)</span></span>
        <div className="relative">
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          {dueDate && (
            <button onClick={() => setDueDate("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!title.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.08] text-zinc-200 border border-white/[0.1] hover:bg-white/[0.13] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all">
          Save
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-zinc-400 transition-all">
          Cancel
        </button>
        {onDelete && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)}
            className="px-3 py-2.5 rounded-xl text-zinc-700 border border-white/[0.06] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all" title="Delete">
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {onDelete && confirmDelete && (
          <button onClick={onDelete}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all whitespace-nowrap">
            Confirm delete
          </button>
        )}
      </div>
    </div>
  )
}