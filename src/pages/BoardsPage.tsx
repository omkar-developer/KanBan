import { useEffect, useState } from "react"
import { useKanbanStore } from "../state/kanbanStore"

interface Props {
  onSelectBoard?: (boardId: string) => void
}

export default function BoardsPage({ onSelectBoard }: Props) {
  const boards = useKanbanStore(s => s.boards)
  const loadBoards = useKanbanStore(s => s.loadBoards)
  const createBoard = useKanbanStore(s => s.createBoard)

  const [name, setName] = useState("")
  const [boardType, setBoardType] = useState<"kanban" | "notes" | "tools">("kanban")
  const [category, setCategory] = useState("")

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  async function handleCreate() {
    if (!name.trim()) return
    await createBoard(name.trim(), boardType, category.trim() || undefined)
    setName("")
    setCategory("")
  }

  const handleSelectBoard = (boardId: string) => {
    onSelectBoard?.(boardId)
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white">Your Boards</h1>
          <p className="text-zinc-400 mt-2">Create and manage your kanban boards</p>
        </div>

        {/* Create Board Section */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-12 shadow-xl">
          <label className="block text-sm font-semibold text-zinc-400 mb-4">CREATE NEW BOARD</label>
          <div className="space-y-4">
            {/* Name Input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />

            {/* Board Type and Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Board Type Dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Board Type</label>
                <select
                  value={boardType}
                  onChange={(e) => setBoardType(e.target.value as "kanban" | "notes" | "tools")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="kanban">Kanban</option>
                  <option value="notes">Notes</option>
                  <option value="tools">Tools</option>
                </select>
              </div>

              {/* Category Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Category (Optional)</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Work, Personal..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Board
            </button>
          </div>
        </div>

        {/* Board List */}
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-zinc-900 mb-4">
              <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <p className="text-white text-lg font-medium">No boards yet</p>
            <p className="text-zinc-400 mt-1">Create your first board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSelectBoard(board.id)}
                className="group bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:border-blue-600 hover:shadow-xl transition-all hover:bg-zinc-800 text-left"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg transition-all">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                  {board.name}
                </h3>
                {board.description && (
                  <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                    {board.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <span className="text-xs text-zinc-500">
                    {new Date(board.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}