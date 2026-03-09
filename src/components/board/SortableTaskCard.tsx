import type { Task } from "../../models/Task"
import TaskCard from "./TaskCard"

interface Props {
  task: Task
}

// FormKit drag-and-drop owns the drag behaviour via the parent wrapper div in Column.tsx.
// This component is now a plain passthrough — no dnd-kit imports needed.
export default function SortableTaskCard({ task }: Props) {
  return <TaskCard task={task} />
}