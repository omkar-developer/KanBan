import { useEffect } from "react"
import { useKanbanStore } from "../../state/kanbanStore"
import Sidebar from "./Sidebar"
import TopBar from "./Topbar"

interface Props {
  children: React.ReactNode
  boardName?: string
  boardId?: string
  onBoardChange?: (boardId: string | null) => void
  onSettingsClick?: () => void
}

export default function MainLayout({ children, boardName, boardId, onBoardChange, onSettingsClick }: Props) {
  const loadBoards = useKanbanStore(s => s.loadBoards)

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <Sidebar onSelectBoard={onBoardChange} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        {boardName && <TopBar boardName={boardName} boardId={boardId} onSettingsClick={onSettingsClick} />}

        {/* Main Content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-app)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}