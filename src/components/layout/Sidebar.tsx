import { useKanbanStore } from "../../state/kanbanStore"
import { useState, useEffect, useRef } from "react"
import type { Board } from "../../models/Board"
import ExplorerTree from "../ui/ExplorerTree"

interface SidebarProps {
  onSelectBoard?: (boardId: string | null) => void
}

export default function Sidebar({ onSelectBoard }: SidebarProps) {
  const boards = useKanbanStore(s => s.boards)
  const createBoard = useKanbanStore(s => s.createBoard)

  const [newBoardName, setNewBoardName] = useState("")
  
  // Board creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalType, setModalType] = useState<"kanban" | "notes" | "tools">("kanban")
  const [modalCategory, setModalCategory] = useState("")

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    await createBoard(newBoardName.trim(), modalType || undefined, modalCategory || undefined)
    setNewBoardName("")
    setShowCreateModal(false)
    setModalType("kanban")
    setModalCategory("")
  }

  const handleSelectBoard = (boardId: string) => {
    onSelectBoard?.(boardId)
  }

  const handleAddToCategory = (category: string) => {
    setShowCreateModal(true)
    setModalType("kanban")
    setModalCategory(category)
  }

  const modalRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (showCreateModal && modalRef.current) {
      setTimeout(() => modalRef.current?.focus(), 50)
    }
  }, [showCreateModal])

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
        <button
          onClick={() => {
            setShowCreateModal(true)
            setModalType("kanban")
            setModalCategory("")
          }}
          className="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Board
        </button>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-4">
        {boards.length > 0 ? (
          <div className="space-y-3">
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>BOARDS</label>
            
            <ExplorerTree<Board>
              items={boards.map(board => ({ ...board, category: board.category || "Uncategorized" }))}
              groupKey="category"
              onCreate={handleAddToCategory}
              onItemSelect={(board) => handleSelectBoard(board.id)}
              renderItem={(board) => (
                <button
                  key={board.id}
                  onClick={() => handleSelectBoard(board.id)}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors group"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'var(--accent)' }}
                    />
                    <span className="truncate">{board.name}</span>
                  </div>
                </button>
              )}
            />
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

      {/* Board Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div 
            className="rounded-xl p-6 w-[420px] shadow-2xl"
            style={{ background: "var(--bg-modal, #161616)", border: "1px solid var(--border, rgba(255,255,255,0.06))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Board</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Board Name */}
              <div>
                <label className="block text-zinc-500 text-sm mb-2 font-medium">Board Name</label>
                <input
                  ref={modalRef}
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name..."
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-lg px-4 py-3 text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                />
              </div>

              {/* Board Type */}
              <div>
                <label className="block text-zinc-500 text-sm mb-2 font-medium">Type</label>
                <div className="flex gap-2">
                  {(["kanban", "notes", "tools"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setModalType(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        modalType === type
                          ? 'bg-sky-600 text-white'
                          : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-zinc-500 text-sm mb-2 font-medium">Category</label>
                <input
                  type="text"
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  placeholder="Enter category (optional)..."
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-lg px-4 py-3 text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleCreateBoard}
              disabled={!newBoardName.trim()}
              className="w-full mt-6 bg-sky-600 hover:bg-sky-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-3 rounded-lg font-semibold transition-all"
            >
              Create Board
            </button>
          </div>
        </div>
      )}
    </div>
  )
}