import { useEffect, useState, useRef } from "react"
import { useKanbanStore } from "../state/kanbanStore"
import type { Board } from "../models/Board"
import EditBoardDialog from "../components/ui/EditBoardDialog"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import {
  Circle, Square, Bookmark, Star, Zap, Flame, Lightbulb, Rocket,
  Bug, Wrench, ClipboardList, LayoutList, Inbox, Pencil, FileText,
  Code2, GitBranch, Database, Server, Cloud, Link, Clock, Calendar,
  CheckCircle, BookOpen, Target, Pin, Sparkles, Coffee, Layers, Hammer
} from "lucide-react"

interface Props {
  onSelectBoard?: (boardId: string) => void
}

const ICON_OPTIONS = [
  { id: "circle", icon: Circle },
  { id: "square", icon: Square },
  { id: "bookmark", icon: Bookmark },
  { id: "star", icon: Star },
  { id: "zap", icon: Zap },
  { id: "flame", icon: Flame },
  { id: "lightbulb", icon: Lightbulb },
  { id: "rocket", icon: Rocket },
  { id: "bug", icon: Bug },
  { id: "wrench", icon: Wrench },
  { id: "clipboard", icon: ClipboardList },
  { id: "list", icon: LayoutList },
  { id: "inbox", icon: Inbox },
  { id: "pencil", icon: Pencil },
  { id: "file", icon: FileText },
  { id: "code", icon: Code2 },
  { id: "branch", icon: GitBranch },
  { id: "database", icon: Database },
  { id: "server", icon: Server },
  { id: "cloud", icon: Cloud },
  { id: "link", icon: Link },
  { id: "clock", icon: Clock },
  { id: "calendar", icon: Calendar },
  { id: "check", icon: CheckCircle },
  { id: "book", icon: BookOpen },
  { id: "target", icon: Target },
  { id: "pin", icon: Pin },
  { id: "sparkles", icon: Sparkles },
  { id: "coffee", icon: Coffee },
  { id: "layers", icon: Layers },
  { id: "hammer", icon: Hammer },
]

const COLOR_OPTIONS = [
  { label: "Zinc", value: "#71717a" },
  { label: "Slate", value: "#64748b" },
  { label: "Sky", value: "#38bdf8" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Emerald", value: "#34d399" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#fbbf24" },
  { label: "Orange", value: "#fb923c" },
  { label: "Rose", value: "#fb7185" },
  { label: "Red", value: "#ef4444" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Pink", value: "#f472b6" },
]

export default function BoardsPage({ onSelectBoard }: Props) {
  const boards = useKanbanStore(s => s.boards)
  const loadBoards = useKanbanStore(s => s.loadBoards)
  const createBoard = useKanbanStore(s => s.createBoard)
  const updateBoard = useKanbanStore(s => s.updateBoard)
  const deleteBoard = useKanbanStore(s => s.deleteBoard)

  const [name, setName] = useState("")
  const [boardType, setBoardType] = useState<"kanban" | "notes">("kanban")
  const [category, setCategory] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("circle")
  const [selectedColor, setSelectedColor] = useState("#3b82f6")
  const [iconTab, setIconTab] = useState<"icon" | "color">("icon")

  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  async function handleCreate() {
    if (!name.trim()) return
    await createBoard(name.trim(), boardType, category.trim() || undefined, selectedIcon, selectedColor)
    setName("")
    setCategory("")
    setSelectedIcon("circle")
    setSelectedColor("#3b82f6")
  }

  const handleSelectBoard = (boardId: string) => {
    onSelectBoard?.(boardId)
  }

  const handleEditBoard = async (board: Partial<Board>) => {
    if (!board.id) return
    await updateBoard(board as Board)
    setEditingBoard(null)
  }

  const handleDeleteBoard = async () => {
    if (!deletingBoard) return
    await deleteBoard(deletingBoard.id)
    setDeletingBoard(null)
    setMenuOpen(null)
  }

  const getBoardIcon = (board: Board) => {
    if (board.icon) {
      const IconComponent = ICON_OPTIONS.find(i => i.id === board.icon)?.icon
      if (IconComponent) return <IconComponent width={24} height={24} className="text-white" />
    }
    return null
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
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Type</label>
                <select
                  value={boardType}
                  onChange={(e) => setBoardType(e.target.value as "kanban" | "notes")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="kanban">Kanban</option>
                  <option value="notes">Notes</option>
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

            {/* Icon Selection */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Icon & Color</label>
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setIconTab("icon")}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition ${
                    iconTab === "icon" 
                      ? "bg-white/[0.08] text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Icon
                </button>
                <button
                  onClick={() => setIconTab("color")}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition ${
                    iconTab === "color" 
                      ? "bg-white/[0.08] text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Color
                </button>
              </div>

              {iconTab === "icon" ? (
                <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedIcon(opt.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition hover:bg-white/[0.08] ${
                          selectedIcon === opt.id ? "bg-white/[0.1]" : ""
                        }`}
                        title={opt.id}
                      >
                        <IconComponent width={18} height={18} className={selectedIcon === opt.id ? "text-white" : "text-zinc-600"} />
                        <span className="text-[8px] text-zinc-600 truncate w-full text-center">{opt.id}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedColor(c.value)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition hover:bg-white/[0.06] ${
                        selectedColor === c.value ? "bg-white/[0.08] text-white" : "text-zinc-400"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
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
            {boards.map((board) => {
              const isMenuOpen = menuOpen === board.id
              
              return (
                <div
                  key={board.id}
                  className="group relative bg-zinc-900 rounded-xl border border-zinc-800 p-6 hover:border-blue-600 hover:shadow-xl transition-all hover:bg-zinc-800"
                >
                  {/* Board Card - Click to open */}
                  <div
                    onClick={() => handleSelectBoard(board.id)}
                    className="cursor-pointer"
                  >
                    {/* Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg transition-all"
                      style={{
                        background: board.color
                          ? `linear-gradient(135deg, ${board.color} 0%, ${board.color}dd 100%)`
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                    >
                      {getBoardIcon(board) || (
                        <span className="text-white font-bold text-lg">
                          {board.name.charAt(0).toUpperCase()}
                        </span>
                      )}
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
                  </div>

                  {/* Board Actions Menu */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(isMenuOpen ? null : board.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Board options"
                    >
                      <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setMenuOpen(null)}
                        />
                        <div
                          className="absolute right-0 top-full mt-1 py-1 rounded-lg border shadow-xl z-50 min-w-[140px]"
                          style={{
                            background: 'var(--bg-popover, #1c1c1c)',
                            borderColor: 'var(--border, rgba(255,255,255,0.06))',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingBoard(board)
                              setMenuOpen(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.08] transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingBoard(board)
                              setMenuOpen(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/[0.08] transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Board Dialog */}
      {editingBoard && (
        <EditBoardDialog
          isOpen={!!editingBoard}
          onClose={() => setEditingBoard(null)}
          onConfirm={handleEditBoard}
          board={editingBoard}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingBoard && (
        <ConfirmDialog
          isOpen={!!deletingBoard}
          onClose={() => setDeletingBoard(null)}
          onConfirm={handleDeleteBoard}
          title="Delete Board"
          message={`Are you sure you want to delete "${deletingBoard.name}"? This will also delete all columns and tasks.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  )
}
