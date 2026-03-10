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
    <div className="flex flex-col w-64 h-full" style={{ 
      backgroundColor: 'var(--bg-app)',
      borderRightColor: 'var(--border)'
    }}>
      {/* Header */}
      <div className="p-6" style={{ borderBottom: `1px solid var(--border)` }}>
        <h1 className="font-bold text-xl">KanBan</h1>
        <p className="text-xs mt-1">Task Management</p>
      </div>

      {/* New Board Section */}
      <div className="p-4" style={{ borderBottom: `1px solid var(--border)` }}>
        <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>NEW BOARD</label>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="Board name..."
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-input)',
              color: 'var(--text-primary)',
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
          />
          <button
            onClick={handleCreateBoard}
            disabled={!newBoardName.trim()}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            Create
          </button>
        </div>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-4">
        {boards.length > 0 ? (
          <div className="space-y-1">
            <label className="block text-xs mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>BOARDS</label>
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSelectBoard(board.id)}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors group"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
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