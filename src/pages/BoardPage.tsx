import { useEffect, useRef } from "react"
import { useKanbanStore } from "../state/kanbanStore"
import BoardView from "../components/board/BoardView"
import { useWindowFocus } from "../hooks/useWindowFocus"
import { store } from "../storage/storage"
import { listen } from "@tauri-apps/api/event"
import { isTauri } from "../utils/exportImport"

interface Props {
  boardId: string
}

export default function BoardPage({ boardId }: Props) {
  const loadBoards = useKanbanStore(s => s.loadBoards)
  const loadBoard  = useKanbanStore(s => s.loadBoard)
  // Last known max change timestamp (from DB, checked on previous focus)
  const lastChangeTime = useRef(0)

  useEffect(() => {
    loadBoards()
    loadBoard(boardId)
  }, [boardId, loadBoards, loadBoard])

  // Listen for Tauri data-changed events (fired by API after MCP edits)
  useEffect(() => {
    if (!isTauri()) return
    listen<{ boardId: string }>("data-changed", (e) => {
      if (e.payload.boardId === boardId) {
        loadBoard(boardId)
      }
    }).then(unsub => () => unsub())
  }, [boardId, loadBoard])

  // Auto-refresh when app regains focus (e.g. after MCP edits).
  // Checks the DB directly for any changes to the current board or its tasks.
  useWindowFocus(async () => {
    const { useKanbanStore } = await import("../state/kanbanStore")
    const state = useKanbanStore.getState()

    // Get current columns for this board from store
    const currentCols = state.columns.filter(c => c.boardId === boardId)
    if (currentCols.length === 0) return

    // Check max updatedAt across ALL tasks in DB for this board's columns
    let maxDbTime = 0
    for (const col of currentCols) {
      const tasks = await store.getTasks(col.id)
      for (const t of tasks) {
        const tTime = t.updatedAt ?? t.createdAt
        if (tTime > maxDbTime) maxDbTime = tTime
      }
    }

    // If nothing changed since last check, skip reload
    if (maxDbTime <= lastChangeTime.current) return

    lastChangeTime.current = maxDbTime
    await loadBoard(boardId)
  })

  return (
    <BoardView boardId={boardId} />
  )
}