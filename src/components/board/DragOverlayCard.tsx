import type { Task } from "../../models/Task"

interface Props {
  task: Task
}

const priorityAccent: Record<string, string> = {
  low: "bg-zinc-700", medium: "bg-sky-500", high: "bg-amber-500", critical: "bg-rose-500",
}

export default function DragOverlayCard({ task }: Props) {
  const accent = priorityAccent[task.priority ?? "low"]
  return (
    <div
      className="relative rounded-xl overflow-hidden border border-white/[0.15] shadow-2xl"
      style={{ background: "var(--bg-card, #141414)", width: 280, rotate: "1.5deg", opacity: 0.95 }}
    >
      {task.priority && task.priority !== "low" && (
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent}`} />
      )}
      <div className="pl-5 pr-4 py-3">
        <p className="text-sm font-semibold text-zinc-100 line-clamp-2 select-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{task.description}</p>
        )}
      </div>
    </div>
  )
}