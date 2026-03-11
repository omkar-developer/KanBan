import { useKanbanStore } from "../../state/kanbanStore"
import { useState, useEffect, useRef } from "react"
import type { Board } from "../../models/Board"
import ExplorerTree from "../ui/ExplorerTree"
import EditBoardDialog from "../ui/EditBoardDialog"
import ConfirmDialog from "../ui/ConfirmDialog"
import {
  Circle, Square, Bookmark, Star, Zap, Flame, Lightbulb, Rocket,
  Bug, Wrench, ClipboardList, LayoutList, Inbox, Pencil, FileText,
  Code2, GitBranch, Database, Server, Cloud, Link, Clock, Calendar,
  CheckCircle, BookOpen, Target, Pin, Sparkles, Coffee, Layers, Hammer
} from "lucide-react"

interface SidebarProps {
  onSelectBoard?: (boardId: string | null, boardType?: "kanban" | "notes") => void
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

export default function Sidebar({ onSelectBoard }: SidebarProps) {
  const boards = useKanbanStore(s => s.boards)
  const createBoard = useKanbanStore(s => s.createBoard)
  const toggleFavorite = useKanbanStore(s => s.toggleFavorite)

  const [newBoardName, setNewBoardName] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("taskflow-sidebar-collapsed")
      return saved === "true"
    } catch {
      return false
    }
  })
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const [menuOpenBoardId, setMenuOpenBoardId] = useState<string | null>(null)

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("taskflow-sidebar-collapsed", String(isCollapsed))
    } catch {
      // Ignore localStorage errors
    }
  }, [isCollapsed])

  // Board creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalType, setModalType] = useState<"kanban" | "notes">("kanban")
  const [modalCategory, setModalCategory] = useState("")
  const [modalIcon, setModalIcon] = useState("circle")
  const [modalColor, setModalColor] = useState("#3b82f6")
  const [iconTab, setIconTab] = useState<"icon" | "color">("icon")

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      return
    }
    try {
      await createBoard(newBoardName.trim(), modalType, modalCategory || undefined, modalIcon, modalColor)
    } catch (error) {
      console.error('[Sidebar] Error creating board:', error)
    }
    setNewBoardName("")
    setShowCreateModal(false)
    setModalType("kanban")
    setModalCategory("")
    setModalIcon("circle")
    setModalColor("#3b82f6")
  }

  const handleSelectBoard = (boardId: string) => {
    const board = boards.find(b => b.id === boardId)
    onSelectBoard?.(boardId, (board?.type as "kanban" | "notes") || "kanban")
  }

  const handleAddToCategory = (category: string, type: "kanban" | "notes" = "kanban") => {
    setShowCreateModal(true)
    setModalType(type)
    setModalCategory(category)
  }

  const handleToggleFavorite = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(boardId)
  }

  const handleEditBoard = async (board: Partial<Board>) => {
    if (!board.id) return
    try {
      await useKanbanStore.getState().updateBoard(board as Board)
      setEditingBoard(null)
    } catch (error) {
      console.error('[Sidebar] Error updating board:', error)
    }
  }

  const handleDeleteBoard = async () => {
    if (!deletingBoardId) return
    try {
      await useKanbanStore.getState().deleteBoard(deletingBoardId)
      setDeletingBoardId(null)
    } catch (error) {
      console.error('[Sidebar] Error deleting board:', error)
    }
  }

  const modalRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (showCreateModal && modalRef.current) {
      setTimeout(() => modalRef.current?.focus(), 50)
    }
  }, [showCreateModal])

  // Separate boards by type (treat undefined/empty type as "kanban")
  const kanbanBoards = boards.filter(b => !b.type || b.type === "kanban")
  const notesBoards = boards.filter(b => b.type === "notes")
  const favoriteBoards = boards.filter(b => b.favorite)

  const getBoardIcon = (board: Board) => {
    if (board.icon) {
      const IconComponent = ICON_OPTIONS.find(i => i.id === board.icon)?.icon
      if (IconComponent) return <IconComponent width={16} height={16} style={{ color: board.color || '#3b82f6' }} />
    }
    return null
  }

  const renderBoardItem = (board: Board, sectionPrefix: string = '') => {
    const uniqueKey = `${sectionPrefix}${board.id}`
    const isMenuOpen = menuOpenBoardId === uniqueKey

    return (
      <div key={uniqueKey} className="group relative">
        {/* Main container with hover background */}
        <div
          onClick={() => handleSelectBoard(board.id)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group/item hover:brightness-110"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.backgroundColor = 'var(--bg-popover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.backgroundColor = 'var(--bg-input)'
          }}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getBoardIcon(board)}
          </div>

          {/* Name */}
          <span 
            className="flex-1 text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {board.name}
          </span>

          {/* Action buttons - visible on hover */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleFavorite(board.id, e)
                }}
                className="p-1.5 rounded transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-input)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                title={board.favorite ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  className="w-4 h-4"
                  style={{
                    color: board.favorite ? "#fbbf24" : "var(--text-muted)",
                    fill: board.favorite ? "currentColor" : "none",
                  }}
                  fill={board.favorite ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenBoardId(isMenuOpen ? null : uniqueKey)
                }}
                className="p-1.5 rounded transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-input)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                title="Board options"
              >
                <svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setMenuOpenBoardId(null)}
            />
            <div
              className="absolute right-0 top-full mt-1 py-1 rounded-lg border shadow-xl z-[9999] min-w-[140px]"
              style={{
                background: 'var(--bg-popover)',
                borderColor: 'var(--border)',
              }}
            >
              <button
                onClick={() => {
                  setEditingBoard(board)
                  setMenuOpenBoardId(null)
                }}
                className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-input)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => {
                  setDeletingBoardId(board.id)
                  setMenuOpenBoardId(null)
                }}
                className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-muted)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
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
    )
  }

  return (
    <>
      <div 
        className="flex flex-col h-full border-r transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderRightColor: 'var(--border)',
          width: isCollapsed ? '64px' : '256px'
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-3">
                {/* App Icon */}
                <img
                  src="/icon.png"
                  alt="TaskFlow"
                  className="w-9 h-9 rounded-xl flex-shrink-0"
                  style={{ 
                    objectFit: "contain",
                    background: "var(--bg-popover)",
                  }}
                />
                <div>
                  <h1 className="font-bold text-xl" style={{ color: "var(--text-primary)" }}>TaskFlow</h1>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Boards & Notes</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-input)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                title="Collapse sidebar"
              >
                <svg className="w-5 h-5" style={{ color: "var(--text-secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7 7" />
                </svg>
              </button>
            </>
          )}
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded transition-colors w-full flex justify-center"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-input)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
              title="Expand sidebar"
            >
              <svg className="w-6 h-6" style={{ color: "var(--text-secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        {/* New Board Section */}
        {!isCollapsed && (
          <div className="p-4" style={{ borderBottom: `1px solid var(--border)` }}>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>NEW</label>
            <button
              onClick={() => {
                setShowCreateModal(true)
                setModalType("kanban")
                setModalCategory("")
                setModalIcon("circle")
                setModalColor("#3b82f6")
              }}
              className="w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-muted)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent)"
                e.currentTarget.style.transform = "scale(1)"
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)"
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>
        )}

        {/* Board List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCollapsed ? (
            // Collapsed state - show only favorites as icons
            <div className="space-y-2">
              {favoriteBoards.map(board => (
                <button
                  key={board.id}
                  onClick={() => handleSelectBoard(board.id)}
                  className="w-full p-2 rounded-lg transition-colors flex items-center justify-center"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-input)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                  title={board.name}
                >
                  {getBoardIcon(board) || (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{
                        background: board.color
                          ? `linear-gradient(135deg, ${board.color} 0%, ${board.color}dd 100%)`
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                    >
                      <span className="text-white font-bold text-sm">
                        {board.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // Expanded state - show all sections
            <div className="space-y-6">
              {/* Favorites Section */}
              {favoriteBoards.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>FAVORITES</label>
                  {favoriteBoards.map(board => renderBoardItem(board, 'fav-'))}
                </div>
              )}

              {/* Kanban Boards */}
              {kanbanBoards.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>KANBAN BOARDS</label>
                  <ExplorerTree<Board>
                    items={kanbanBoards.map(board => ({ ...board, category: board.category || "Uncategorized" }))}
                    groupKey="category"
                    onCreate={handleAddToCategory}
                    renderItem={(board) => renderBoardItem(board, 'kanban-')}
                  />
                </div>
              )}

              {/* Notes Boards */}
              {notesBoards.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>NOTES</label>
                  <ExplorerTree<Board>
                    items={notesBoards.map(board => ({ ...board, category: board.category || "Uncategorized" }))}
                    groupKey="category"
                    onCreate={(category) => handleAddToCategory(category, "notes")}
                    renderItem={(board) => renderBoardItem(board, 'notes-')}
                  />
                </div>
              )}

              {boards.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>No boards yet</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>Create one to get started</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Removed settings button */}
      </div>

      {/* Board Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="rounded-xl p-6 w-[420px] shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-modal)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Create</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-input)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" style={{ color: "var(--text-secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Board Name */}
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Name</label>
                <input
                  ref={modalRef}
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)"
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                />
              </div>

              {/* Board Type */}
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Type</label>
                <div className="flex gap-2">
                  {(["kanban", "notes"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setModalType(type)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: modalType === type ? "var(--accent)" : "var(--bg-input)",
                        color: modalType === type ? "#fff" : "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        if (modalType !== type) {
                          e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
                          e.currentTarget.style.color = "var(--text-primary)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (modalType !== type) {
                          e.currentTarget.style.backgroundColor = "var(--bg-input)"
                          e.currentTarget.style.color = "var(--text-secondary)"
                        }
                      }}
                    >
                      {type === "kanban" ? "Kanban" : "Notes"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Category</label>
                <input
                  type="text"
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  placeholder="Enter category (optional)..."
                  className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)"
                  }}
                />
              </div>

              {/* Board Icon */}
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Icon</label>
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setIconTab("icon")}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition"
                    style={{
                      backgroundColor: iconTab === "icon" ? "var(--bg-input)" : "transparent",
                      color: iconTab === "icon" ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      if (iconTab !== "icon") {
                        e.currentTarget.style.color = "var(--text-secondary)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (iconTab !== "icon") {
                        e.currentTarget.style.color = "var(--text-muted)"
                      }
                    }}
                  >
                    Icon
                  </button>
                  <button
                    onClick={() => setIconTab("color")}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition"
                    style={{
                      backgroundColor: iconTab === "color" ? "var(--bg-input)" : "transparent",
                      color: iconTab === "color" ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      if (iconTab !== "color") {
                        e.currentTarget.style.color = "var(--text-secondary)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (iconTab !== "color") {
                        e.currentTarget.style.color = "var(--text-muted)"
                      }
                    }}
                  >
                    Color
                  </button>
                </div>

                {iconTab === "icon" ? (
                  <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto p-2 rounded-lg border"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                    {ICON_OPTIONS.map((opt) => {
                      const IconComponent = opt.icon
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setModalIcon(opt.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg transition"
                          style={{
                            backgroundColor: modalIcon === opt.id ? "var(--bg-input)" : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--bg-input)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = modalIcon === opt.id ? "var(--bg-input)" : "transparent"
                          }}
                          title={opt.id}
                        >
                          <IconComponent width={16} height={16} style={{ color: modalIcon === opt.id ? modalColor : "var(--text-muted)" }} />
                          <span className="text-[8px] truncate w-full text-center" style={{ color: "var(--text-muted)" }}>{opt.id}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg border"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setModalColor(c.value)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition"
                        style={{
                          backgroundColor: modalColor === c.value ? "var(--bg-input)" : "transparent",
                          color: modalColor === c.value ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                        onMouseEnter={(e) => {
                          if (modalColor !== c.value) {
                            e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
                            e.currentTarget.style.color = "var(--text-secondary)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (modalColor !== c.value) {
                            e.currentTarget.style.backgroundColor = "transparent"
                            e.currentTarget.style.color = "var(--text-muted)"
                          }
                        }}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateBoard}
              disabled={!newBoardName.trim()}
              className="w-full mt-6 px-4 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: !newBoardName.trim() ? "var(--bg-input)" : "var(--accent)",
                color: !newBoardName.trim() ? "var(--text-muted)" : "#fff",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (newBoardName.trim()) {
                  e.currentTarget.style.backgroundColor = "var(--accent-muted)"
                }
              }}
              onMouseLeave={(e) => {
                if (newBoardName.trim()) {
                  e.currentTarget.style.backgroundColor = "var(--accent)"
                  e.currentTarget.style.transform = "scale(1)"
                }
              }}
              onMouseDown={(e) => {
                if (newBoardName.trim()) {
                  e.currentTarget.style.transform = "scale(0.98)"
                }
              }}
              onMouseUp={(e) => {
                if (newBoardName.trim()) {
                  e.currentTarget.style.transform = "scale(1)"
                }
              }}
            >
              Create Board
            </button>
          </div>
        </div>
      )}

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
      {deletingBoardId && (
        <ConfirmDialog
          isOpen={!!deletingBoardId}
          onClose={() => setDeletingBoardId(null)}
          onConfirm={handleDeleteBoard}
          title="Delete Board"
          message="Are you sure you want to delete this board? This will also delete all columns and tasks."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </>
  )
}