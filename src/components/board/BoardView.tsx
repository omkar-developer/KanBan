import { useEffect, useMemo, useState } from "react"
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import type { DropResult, DroppableProvided } from "@hello-pangea/dnd"
import { useKanbanStore } from "../../state/kanbanStore"
import type { Task } from "../../models/Task"
import Column from "./Column"
import TextInputDialog from "../ui/TextInputDialog"
import ListView from "./ListView"
import CardGridView from "./CardGridView"
import NotesView from "./NotesView"

interface Props {
  boardId: string
}

export default function BoardView({ boardId }: Props) {
  const activeBoard            = useKanbanStore(s => s.activeBoard)
  const columns                = useKanbanStore(s => s.columns)
  const tasks                  = useKanbanStore(s => s.tasks)
  const activeTags             = useKanbanStore(s => s.activeTags)
  const searchQuery            = useKanbanStore(s => s.searchQuery)
  const viewMode               = useKanbanStore(s => s.viewMode)
  const showArchived           = useKanbanStore(s => s.showArchived)
  const createColumn           = useKanbanStore(s => s.createColumn)
  const loadBoard              = useKanbanStore(s => s.loadBoard)
  const moveColumn             = useKanbanStore(s => s.moveColumn)
  const reorderTasksOptimistic = useKanbanStore(s => s.reorderTasksOptimistic)
  const persistTaskOrder       = useKanbanStore(s => s.persistTaskOrder)

  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)

  const boardType    = activeBoard?.type || "kanban"
  const isNotesBoard = viewMode === "notes" || boardType === "notes"

  const isArchived = (task: Task) => (task.data?.archived as boolean) === true

  useEffect(() => { loadBoard(boardId) }, [boardId, loadBoard])

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns]
  )

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    if (type === "COLUMN") {
      await moveColumn(sortedColumns[source.index].id, destination.index)
      return
    }

    if (type === "TASK") {
      const fromColId   = source.droppableId
      const toColId     = destination.droppableId
      const toIndex     = destination.index
      const sourceTasks = tasks
        .filter(t => t.columnId === fromColId)
        .sort((a, b) => a.order - b.order)
      const movedTaskId = sourceTasks[source.index]?.id
      if (!movedTaskId) return
      reorderTasksOptimistic(movedTaskId, toColId, toIndex)
      await persistTaskOrder(fromColId === toColId ? [fromColId] : [fromColId, toColId])
    }
  }

  // Board view tasks — filtered, no archived unless toggled
  const boardViewTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!showArchived && isArchived(task)) return false
      if (activeTags.length > 0 && !task.tags?.some(tag => activeTags.includes(tag))) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!(
          task.title.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          task.tags?.some(tag => tag.toLowerCase().includes(q))
        )) return false
      }
      return true
    })
  }, [tasks, activeTags, searchQuery, showArchived])

  // ── Notes board ────────────────────────────────────────────────────────────
  if (isNotesBoard) {
    if (viewMode === "list") {
      return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            <ListView />
          </div>
        </div>
      )
    }
    if (viewMode === "grid") {
      return (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px" }}>
          <CardGridView />
        </div>
      )
    }
    // "notes" mode (or any other) → notes editor
    return (
      <div className="flex-1 min-h-0 overflow-hidden">
        <NotesView />
      </div>
    )
  }

  // ── List view — needs its own scroll container so header + footer can stick ─
  if (viewMode === "list") {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content area */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px",
            // Give the inner ListView access to height for its sticky table header
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ListView />
        </div>
      </div>
    )
  }

  // ── Grid view ──────────────────────────────────────────────────────────────
  if (viewMode === "grid") {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "20px 24px",
        }}
      >
        <CardGridView />
      </div>
    )
  }

  // ── Board (kanban) view ────────────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Outer scroll — horizontal only for column overflow */}
        <div
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            padding: "24px 32px",
            display: "flex",
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(113,113,122,0.04) 79px, rgba(113,113,122,0.04) 80px),
              repeating-linear-gradient(0deg,  transparent, transparent 79px, rgba(113,113,122,0.04) 79px, rgba(113,113,122,0.04) 80px)
            `,
          }}
        >
          {/* Droppable for column reordering — horizontal */}
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(provided: DroppableProvided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  display: "flex",
                  gap: 20,
                  alignItems: "stretch",
                  height: "100%",
                }}
              >
                {sortedColumns.map((col, index) => {
                  const colTasks = boardViewTasks
                    .filter(t => t.columnId === col.id)
                    .sort((a, b) => a.order - b.order)
                  return (
                    <Column
                      key={col.id}
                      column={col}
                      tasks={colTasks}
                      index={index}
                    />
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add Column button */}
          <button
            onClick={() => setShowAddColumnDialog(true)}
            style={{
              flexShrink: 0,
              alignSelf: "flex-start",
              width: 280,
              padding: "14px 24px",
              borderRadius: 16,
              border: "1px dashed rgba(255,255,255,0.08)",
              backgroundColor: "transparent",
              color: "#52525b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginLeft: 8,
              transition: "border-color 0.15s, color 0.15s, background-color 0.15s",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
              e.currentTarget.style.color = "#a1a1aa"
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
              e.currentTarget.style.color = "#52525b"
              e.currentTarget.style.backgroundColor = "transparent"
            }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 14 14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 2v10M2 7h10" />
            </svg>
            Add Column
          </button>
        </div>

        <TextInputDialog
          isOpen={showAddColumnDialog}
          onClose={() => setShowAddColumnDialog(false)}
          onConfirm={async (name) => { await createColumn(boardId, name); setShowAddColumnDialog(false) }}
          title="Add Column"
          label="Column Name"
          placeholder="Enter column name..."
          required
        />
      </DragDropContext>
    </div>
  )
}