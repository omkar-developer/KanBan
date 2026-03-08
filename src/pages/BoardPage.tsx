import { useEffect } from "react"
import { useKanbanStore } from "../state/kanbanStore"
import BoardView from "../components/board/BoardView"

interface Props {
  boardId: string
}

export default function BoardPage({ boardId }: Props) {
  const loadBoard = useKanbanStore(s => s.loadBoard)

  useEffect(() => {
    loadBoard(boardId)
  }, [boardId, loadBoard])

  return (
    <BoardView boardId={boardId} />
  )
}