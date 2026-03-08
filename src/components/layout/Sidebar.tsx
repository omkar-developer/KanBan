import { useKanbanStore } from "../../state/kanbanStore"
import { useState } from "react"

interface SidebarProps {
  onSelectBoard?: (boardId: string | null) => void
}

export default function Sidebar({ onSelectBoard }: SidebarProps) {
  const boards = useKanbanStore(s => s.boards)
  const createBoard = useKanbanStore(s => s.createBoard)

  const [newBoardName, setNewBoardName] = useState("")

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    await createBoard(newBoardName.trim())
    setNewBoardName("")
  }

  const handleSelectBoard = (boardId: string) => {
    onSelectBoard?.(boardId)
  }

  return (
    <div className="flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 h-full">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="font-bold text-xl text-white">KanBan</h1>
        <p className="text-xs text-zinc-400 mt-1">Task Management</p>
      </div>

      {/* New Board Section */}
      <div className="p-4 border-b border-zinc-800">
        <label className="block text-xs font-semibold text-zinc-400 mb-2">NEW BOARD</label>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="Board name..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
          />
          <button
            onClick={handleCreateBoard}
            disabled={!newBoardName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Create
          </button>
        </div>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-4">
        {boards.length > 0 ? (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-400 mb-3">BOARDS</label>
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSelectBoard(board.id)}
                className="w-full text-left px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-sm font-medium transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:bg-blue-400"/>
                  <span className="truncate">{board.name}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">No boards yet</p>
            <p className="text-zinc-500 text-xs mt-1">Create one to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}