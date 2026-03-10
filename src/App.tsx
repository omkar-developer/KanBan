import { useEffect, useState } from "react"
import { useKanbanStore } from "./state/kanbanStore"
import MainLayout from "./components/layout/MainLayout"
import BoardPage from "./pages/BoardPage"
import EmptyState from "./pages/EmptyState"

const LAST_BOARD_KEY = "kanban-last-board"

function App() {
  const boards = useKanbanStore(s => s.boards)
  const loadBoards = useKanbanStore(s => s.loadBoards)
  const createBoard = useKanbanStore(s => s.createBoard)
  const loadBoard = useKanbanStore(s => s.loadBoard)

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  // Auto-load last board or show empty state
  useEffect(() => {
    if (!initialized && boards.length > 0) {
      setInitialized(true)
      
      // Try to load last board from localStorage
      const lastBoardId = localStorage.getItem(LAST_BOARD_KEY)
      if (lastBoardId && boards.find(b => b.id === lastBoardId)) {
        setSelectedBoardId(lastBoardId)
        loadBoard(lastBoardId)
      } else {
        // No valid last board, just show empty state (first board will be selected after creation)
      }
    }
  }, [boards, initialized, loadBoard])

  const handleSelectBoard = (boardId: string) => {
    localStorage.setItem(LAST_BOARD_KEY, boardId)
    setSelectedBoardId(boardId)
    loadBoard(boardId)
  }

  const handleCreateBoard = async (name: string, type: "kanban" | "notes" | "tools", category?: string, icon?: string, color?: string) => {
    await createBoard(name, type, category, icon, color)
  }

  // After boards are loaded, if we have boards but no selection, select the first one or last one
  useEffect(() => {
    if (initialized && boards.length > 0 && !selectedBoardId) {
      const lastBoardId = localStorage.getItem(LAST_BOARD_KEY)
      const boardToSelect = boards.find(b => b.id === lastBoardId) || boards[0]
      if (boardToSelect) {
        handleSelectBoard(boardToSelect.id)
      }
    }
  }, [boards, initialized, selectedBoardId])

  // Show board page if a board is selected
  if (selectedBoardId) {
    const selectedBoard = boards.find(b => b.id === selectedBoardId)
    return (
      <MainLayout boardName={selectedBoard?.name} boardId={selectedBoardId} onBoardChange={handleSelectBoard}>
        <BoardPage boardId={selectedBoardId} />
      </MainLayout>
    )
  }

  // Show empty state for creating first board
  return (
    <MainLayout onBoardChange={handleSelectBoard}>
      <EmptyState onCreateBoard={handleCreateBoard} />
    </MainLayout>
  )
}

export default App
