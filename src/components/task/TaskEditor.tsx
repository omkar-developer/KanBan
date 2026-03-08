import { useState } from "react"
import type { Task } from "../../models/Task"
import type { TaskPriority } from "../../models/Task"

interface TaskEditorProps {
  task: Task
  onSave: (updates: Partial<Task>) => Promise<void>
  onCancel: () => void
}

const priorityOptions: { value: TaskPriority; label: string; dot: string; bg: string; border: string; text: string }[] = [
  { value: "low",      label: "Low",      dot: "bg-zinc-500",   bg: "bg-zinc-800",        border: "border-zinc-700",      text: "text-zinc-300" },
  { value: "medium",   label: "Medium",   dot: "bg-sky-400",    bg: "bg-sky-500/10",      border: "border-sky-500/30",    text: "text-sky-400" },
  { value: "high",     label: "High",     dot: "bg-amber-400",  bg: "bg-amber-500/10",    border: "border-amber-500/30",  text: "text-amber-400" },
  { value: "critical", label: "Critical", dot: "bg-rose-400",   bg: "bg-rose-500/10",     border: "border-rose-500/30",   text: "text-rose-400" },
]

const fieldClass = `
  w-full bg-white/[0.04] border border-white/[0.09] rounded-xl
  px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600
  outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10
  caret-zinc-300 transition-all leading-relaxed
  [color-scheme:dark]
`

export default function TaskEditor({ task, onSave, onCancel }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "low")
  const [dueDate, setDueDate] = useState<string>(() =>
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  )

  const handleSave = async () => {
    if (!title.trim()) return
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
    })
  }

  const labelClass = "text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5"

  const selectedPriority = priorityOptions.find(p => p.value === priority)!

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Title */}
      <div>
        <p className={labelClass}>Title</p>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); handleSave() }
          }}
          placeholder="Task title..."
          autoFocus
          className={fieldClass}
        />
      </div>

      {/* Description */}
      <div>
        <p className={labelClass}>Description</p>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave() }
          }}
          placeholder="Add details... (Shift+Enter for new line)"
          rows={4}
          className={`${fieldClass} resize-none`}
        />
        <p className="text-[10px] text-zinc-700 mt-1.5 pl-0.5">Markdown supported · Shift+Enter for new line · Enter to save</p>
      </div>

      {/* Priority — button group */}
      <div>
        <p className={labelClass}>Priority</p>
        <div className="flex gap-1.5">
          {priorityOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPriority(opt.value)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                border transition-all duration-150
                ${priority === opt.value
                  ? `${opt.bg} ${opt.border} ${opt.text}`
                  : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400"
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priority === opt.value ? opt.dot : "bg-zinc-700"}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due Date */}
      <div>
        <p className={labelClass}>Due Date <span className="normal-case font-normal text-zinc-700 tracking-normal">(optional)</span></p>
        <div className="relative">
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={fieldClass}
          />
          {dueDate && (
            <button
              onClick={() => setDueDate("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.08] text-zinc-200 border border-white/[0.1] hover:bg-white/[0.13] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Save changes
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-zinc-400 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}