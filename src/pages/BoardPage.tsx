import { useEffect } from "react"
import { useKanbanStore } from "../state/kanbanStore"
import BoardView from "../components/board/BoardView"

interface Props {
  boardId: string
}

export default function BoardPage({ boardId }: Props) {
  const loadBoards = useKanbanStore(s => s.loadBoards)
  const loadBoard  = useKanbanStore(s => s.loadBoard)

  useEffect(() => {
    // Load all boards to get metadata
    loadBoards()
    
    // Then load the specific board
    loadBoard(boardId)
  }, [boardId, loadBoards, loadBoard])

  return (
    <BoardView boardId={boardId} />
  )
}