import { useCallback, useEffect, useState } from "react"
import { useKanbanStore } from "./state/kanbanStore"
import MainLayout from "./components/layout/MainLayout"
import BoardPage from "./pages/BoardPage"
import EmptyState from "./pages/EmptyState"
import { useAutoBackup } from "./hooks/useAutoBackup"

const LAST_BOARD_KEY      = "kanban-last-board"
const LAST_BOARD_TYPE_KEY = "kanban-last-board-type"


function App() {
  const boards      = useKanbanStore(s => s.boards)
  const loadBoards  = useKanbanStore(s => s.loadBoards)
  const createBoard = useKanbanStore(s => s.createBoard)
  const loadBoard   = useKanbanStore(s => s.loadBoard)
  const setViewMode = useKanbanStore(s => s.setViewMode)

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    () => localStorage.getItem(LAST_BOARD_KEY)
  )

  useAutoBackup()

  // Load boards on mount, then validate saved board still exists and set viewMode
  useEffect(() => {
    loadBoards().then(() => {
      const currentBoards = useKanbanStore.getState().boards
      if (!currentBoards.length) return

      const saved       = localStorage.getItem(LAST_BOARD_KEY)
      const savedBoard  = currentBoards.find(b => b.id === saved)
      const boardToUse  = savedBoard || currentBoards[0]
      
      // Set viewMode based on saved preference or board type
      let viewModeToSet: 'board' | 'notes' = 'board'
      const savedViewMode = localStorage.getItem(LAST_BOARD_TYPE_KEY)
      if (savedViewMode) {
        viewModeToSet = (savedViewMode === 'notes') ? 'notes' : 'board'
      } else if (boardToUse.type === 'notes') {
        viewModeToSet = 'notes'
      }
      setViewMode(viewModeToSet)

      if (!savedBoard) {
        const type = boardToUse.type === "notes" ? "notes" : "board"
        localStorage.setItem(LAST_BOARD_KEY, boardToUse.id)
        localStorage.setItem(LAST_BOARD_TYPE_KEY, boardToUse.type ?? "kanban")
        setSelectedBoardId(boardToUse.id)
      }
    })
  }, [loadBoards, setViewMode])

  // Load board data whenever selection changes and restore saved viewMode
  useEffect(() => {
    if (selectedBoardId) {
      loadBoard(selectedBoardId)
      // Restore the saved view mode for this board
      let viewModeToSet: 'board' | 'notes' = 'board'
      const savedViewMode = localStorage.getItem(LAST_BOARD_TYPE_KEY)
      
      if (savedViewMode) {
        // Use saved viewMode if available
        viewModeToSet = (savedViewMode === 'notes') ? 'notes' : 'board'
      } else {
        // Otherwise default based on board type
        const board = boards.find(b => b.id === selectedBoardId)
        if (board?.type === 'notes') {
          viewModeToSet = 'notes'
        }
      }
      
      setViewMode(viewModeToSet)
    }
  }, [selectedBoardId, loadBoard, setViewMode, boards])

  // Sidebar passes boardType as second arg — use it to set viewMode immediately
  const handleSelectBoard = useCallback((boardId: string | null, boardType?: "kanban" | "notes") => {
    if (boardId) {
      localStorage.setItem(LAST_BOARD_KEY, boardId)
      localStorage.setItem(LAST_BOARD_TYPE_KEY, boardType ?? "kanban")
      setViewMode(boardType === "notes" ? "notes" : "board")
    }
    setSelectedBoardId(boardId)
  }, [setViewMode])

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
    return (
      <MainLayout boardName={selectedBoard?.name} boardId={selectedBoardId} onBoardChange={handleSelectBoard}>
        <BoardPage boardId={selectedBoardId} />
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