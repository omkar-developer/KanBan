import { useCallback, useEffect, useState } from "react"
import { useKanbanStore } from "./state/kanbanStore"
import MainLayout from "./components/layout/MainLayout"
import BoardPage from "./pages/BoardPage"
import NotesView from "./components/board/NotesView"
import EmptyState from "./pages/EmptyState"
import { useAutoBackup } from "./hooks/useAutoBackup"

const LAST_BOARD_KEY = "kanban-last-board"

function App() {
  const boards      = useKanbanStore(s => s.boards)
  const loadBoards  = useKanbanStore(s => s.loadBoards)
  const createBoard = useKanbanStore(s => s.createBoard)
  const loadBoard   = useKanbanStore(s => s.loadBoard)

  // Initialise from localStorage immediately — no effect needed
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    () => localStorage.getItem(LAST_BOARD_KEY)
  )

  useAutoBackup()

  // Load boards on mount, then validate saved board still exists
  useEffect(() => {
    loadBoards().then(() => {
      const currentBoards = useKanbanStore.getState().boards
      if (!currentBoards.length) return

      const saved = localStorage.getItem(LAST_BOARD_KEY)
      const stillExists = currentBoards.find(b => b.id === saved)

      if (!stillExists) {
        // Saved board was deleted — fall back to first available
        const fallback = currentBoards[0]
        localStorage.setItem(LAST_BOARD_KEY, fallback.id)
        setSelectedBoardId(fallback.id)
      }
    })
  }, [loadBoards])

  // Load board data whenever selection changes
  useEffect(() => {
    if (selectedBoardId) loadBoard(selectedBoardId)
  }, [selectedBoardId, loadBoard])

  const handleSelectBoard = useCallback((boardId: string | null) => {
    if (boardId) localStorage.setItem(LAST_BOARD_KEY, boardId)
    setSelectedBoardId(boardId)
  }, [])

  const handleCreateBoard = async (
    name: string,
    type: "kanban" | "notes" | "tools",
    category?: string,
    icon?: string,
    color?: string
  ) => {
    await createBoard(name, type, category, icon, color)
  }

  if (selectedBoardId) {
    const selectedBoard = boards.find(b => b.id === selectedBoardId)
    const isNotes = selectedBoard?.type === "notes"
    return (
      <MainLayout boardName={selectedBoard?.name} boardId={selectedBoardId} onBoardChange={handleSelectBoard}>
        {isNotes ? <NotesView /> : <BoardPage boardId={selectedBoardId} />}
      </MainLayout>
    )
  }

  return (
    <MainLayout onBoardChange={handleSelectBoard}>
      <EmptyState onCreateBoard={handleCreateBoard} />
    </MainLayout>
  )
}

export default App