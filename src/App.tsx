import { useEffect, useState } from "react"
import { useKanbanStore } from "./state/kanbanStore"
import MainLayout from "./components/layout/MainLayout"
import BoardPage from "./pages/BoardPage"
import BoardsPage from "./pages/BoardsPage"

function App() {
  const boards = useKanbanStore(s => s.boards)
  const loadBoards = useKanbanStore(s => s.loadBoards)
  
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  // Show board page if a board is selected
  if (selectedBoardId) {
    const selectedBoard = boards.find(b => b.id === selectedBoardId)
    return (
      <MainLayout boardName={selectedBoard?.name} boardId={selectedBoardId} onBoardChange={setSelectedBoardId}>
        <BoardPage boardId={selectedBoardId} />
      </MainLayout>
    )
  }

  // Show boards page
  return (
    <MainLayout>
      <BoardsPage onSelectBoard={setSelectedBoardId} />
    </MainLayout>
  )
}

export default App