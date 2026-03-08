import { useEffect } from "react"
import { useKanbanStore } from "../../state/kanbanStore"
import Sidebar from "./Sidebar"
import TopBar from "./Topbar"

interface Props {
  children: React.ReactNode
  boardName?: string
  onBoardChange?: (boardId: string | null) => void
  onSettingsClick?: () => void
}

export default function MainLayout({ children, boardName, onBoardChange, onSettingsClick }: Props) {
  const loadBoards = useKanbanStore(s => s.loadBoards)

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <Sidebar onSelectBoard={onBoardChange} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        {boardName && <TopBar boardName={boardName} onSettingsClick={onSettingsClick} />}

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}