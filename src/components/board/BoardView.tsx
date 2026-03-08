import { useState, useEffect } from "react"
import { useKanbanStore } from "../../state/kanbanStore"
import Column from "./Column"
import TextInputDialog from "../ui/TextInputDialog"

interface Props {
  boardId: string
}

export default function BoardView({ boardId }: Props) {
  const columns = useKanbanStore(s => s.columns)
  const createColumn = useKanbanStore(s => s.createColumn)
  const loadBoard = useKanbanStore(s => s.loadBoard)

  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)

  useEffect(() => {
    loadBoard(boardId)
  }, [boardId, loadBoard])

  // Sort columns by order field
  const sortedColumns = columns.sort((a, b) => a.order - b.order)

  const handleAddColumn = async () => {
    setShowAddColumnDialog(true)
  }

  const handleColumnConfirmed = async (name: string) => {
    await createColumn(boardId, name)
    setShowAddColumnDialog(false)
  }

  return (
    <div
      className="flex gap-6 overflow-x-auto p-8 min-h-full w-full relative"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 79px,
            rgba(113, 113, 122, 0.05) 79px,
            rgba(113, 113, 122, 0.05) 80px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 79px,
            rgba(113, 113, 122, 0.05) 79px,
            rgba(113, 113, 122, 0.05) 80px
          )
        `,
      }}
    >
      {/* Columns */}
      {sortedColumns.map((col) => (
        <Column key={col.id} column={col} />
      ))}

      {/* Add Column Button */}
      <button
        onClick={handleAddColumn}
        className="flex-shrink-0 w-72 h-fit px-6 py-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2 hover:bg-zinc-900/50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium">Add Column</span>
      </button>

      {/* Add Column Dialog */}
      <TextInputDialog
        isOpen={showAddColumnDialog}
        onClose={() => setShowAddColumnDialog(false)}
        onConfirm={handleColumnConfirmed}
        title="Add Column"
        label="Column Name"
        placeholder="Enter column name..."
        required
      />
    </div>
  )
}