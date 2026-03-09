import { Circle } from "lucide-react"
import type { Column } from "../../models/Column"

interface Props {
  column: Column
  taskCount: number
}

export default function DragOverlayColumn({ column, taskCount }: Props) {
  return (
    <div
      className="rounded-2xl border border-white/[0.15] shadow-2xl overflow-hidden"
      style={{ background: "#181818", width: 300, rotate: "1deg", opacity: 0.92 }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 justify-between">
          <div className="flex items-center gap-2">
            <Circle width={15} height={15} style={{ color: column.color ?? "#71717a" }} strokeWidth={1.75} />
            <span className="font-semibold text-zinc-100 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {column.name}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-zinc-500 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-full">
            {taskCount}
          </span>
        </div>
        <div className="mt-3 h-px bg-white/[0.05]" />
      </div>
      <div className="px-3 pb-3 h-16 flex items-center justify-center">
        <p className="text-xs text-zinc-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {taskCount} task{taskCount !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}