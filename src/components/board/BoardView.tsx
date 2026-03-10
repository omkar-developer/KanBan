import { useEffect, useMemo, useState } from "react"
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import type { DropResult, DroppableProvided } from "@hello-pangea/dnd"
import { useKanbanStore } from "../../state/kanbanStore"
import type { Task } from "../../models/Task"
import Column from "./Column"
import TextInputDialog from "../ui/TextInputDialog"
import ListView from "./ListView"
import CardGridView from "./CardGridView"
import ArchiveView from "./ArchiveView"

interface Props {
  boardId: string
}

export default function BoardView({ boardId }: Props) {
  const columns           = useKanbanStore(s => s.columns)
  const tasks             = useKanbanStore(s => s.tasks)
  const activeTags        = useKanbanStore(s => s.activeTags)
  const searchQuery       = useKanbanStore(s => s.searchQuery)
  const viewMode          = useKanbanStore(s => s.viewMode)
  const showArchived      = useKanbanStore(s => s.showArchived)
  const setViewMode       = useKanbanStore(s => s.setViewMode)
  const setShowArchived   = useKanbanStore(s => s.setShowArchived)
  const setActiveTags     = useKanbanStore(s => s.setActiveTags)
  const toggleTag         = useKanbanStore(s => s.toggleTag)
  const createColumn      = useKanbanStore(s => s.createColumn)
  const loadBoard         = useKanbanStore(s => s.loadBoard)
  const moveColumn        = useKanbanStore(s => s.moveColumn)
  const reorderTasksOptimistic = useKanbanStore(s => s.reorderTasksOptimistic)
  const persistTaskOrder       = useKanbanStore(s => s.persistTaskOrder)

  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)

  // Helper to check if task is archived
  const isArchived = (task: Task): boolean => {
    return (task.data?.archived as boolean) === true
  }

  // Filter tasks based on active tags AND search query
  const filteredTasks = useMemo(() => {
    let result = tasks
    
    // First filter by tags if any are selected
    if (activeTags.length > 0) {
      result = result.filter(task =>
        task.tags?.some(tag => activeTags.includes(tag))
      )
    }
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    return result
  }, [tasks, activeTags, searchQuery])

  useEffect(() => { loadBoard(boardId) }, [boardId, loadBoard])

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns]
  )

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result

    // Dropped outside any droppable — do nothing
    if (!destination) return

    // Dropped in same place — do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return

    if (type === "COLUMN") {
      // hello-pangea gives us the exact from/to index — pass straight to store
      await moveColumn(sortedColumns[source.index].id, destination.index)
      return
    }

    if (type === "TASK") {
      const fromColId = source.droppableId
      const toColId   = destination.droppableId
      const toIndex   = destination.index

      // Get the dragged task id from the source column tasks in order
      const sourceTasks = tasks
        .filter(t => t.columnId === fromColId)
        .sort((a, b) => a.order - b.order)
      const movedTaskId = sourceTasks[source.index]?.id
      if (!movedTaskId) return

      // Optimistic update (instant UI)
      reorderTasksOptimistic(movedTaskId, toColId, toIndex)

      // Persist to IndexedDB
      const colsToPersist = fromColId === toColId
        ? [fromColId]
        : [fromColId, toColId]
      await persistTaskOrder(colsToPersist)
    }
  }

  // Filter tasks for board view (hide archived unless showArchived is true)
  const boardViewTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!showArchived && isArchived(task)) return false
      
      // Tag filter
      if (activeTags.length > 0) {
        if (!task.tags?.some(tag => activeTags.includes(tag))) return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (!(
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          task.tags?.some(tag => tag.toLowerCase().includes(query))
        )) return false
      }
      
      return true
    })
  }, [tasks, activeTags, searchQuery, showArchived])

  const sortedBoardColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns]
  )

  return (
    <div className="flex-1">
      {/* View Content */}
      {viewMode === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Outer scroll container — NOT a Droppable, just a flex row */}
          <div
            className="flex gap-6 overflow-x-auto p-8 min-h-full w-full"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(113,113,122,0.05) 79px, rgba(113,113,122,0.05) 80px),
                repeating-linear-gradient(0deg,  transparent, transparent 79px, rgba(113,113,122,0.05) 79px, rgba(113,113,122,0.05) 80px)
              `,
            }}
          >
            {/* Droppable for column reordering — direction horizontal */}
            {/* We render it as a transparent flex wrapper so columns stay side by side */}
            <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                  {(provided: DroppableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex gap-6 items-stretch"
                    >
                      {sortedBoardColumns.map((col, index) => {
                        const colTasks = boardViewTasks
                          .filter(t => t.columnId === col.id)
                          .sort((a, b) => a.order - b.order)
                        const filteredColTasks = colTasks.filter(t => 
                          activeTags.length === 0 || 
                          t.tags?.some(tag => activeTags.includes(tag))
                        )
                        return (
                          <Column
                            key={col.id}
                            column={col}
                            tasks={filteredColTasks}
                            index={index}
                          />
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

              {/* Add Column button — outside the droppable so it's never a drag target */}
              <button
                onClick={() => setShowAddColumnDialog(true)}
                className="flex-shrink-0 self-start w-[300px] px-6 py-4 rounded-2xl border border-dashed border-white/[0.08] hover:border-white/[0.15] text-zinc-600 hover:text-zinc-400 transition-all flex items-center justify-center gap-2 hover:bg-white/[0.02]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 2v10M2 7h10" />
                </svg>
                <span className="text-sm font-medium">Add Column</span>
              </button>
            </div>

            <TextInputDialog
              isOpen={showAddColumnDialog}
              onClose={() => setShowAddColumnDialog(false)}
              onConfirm={async (name) => { await createColumn(boardId, name); setShowAddColumnDialog(false) }}
              title="Add Column" label="Column Name" placeholder="Enter column name..." required
            />
          </DragDropContext>
        )}

        {/* List View */}
        {viewMode === 'list' && <ListView />}

        {/* Grid View */}
        {viewMode === 'grid' && <CardGridView />}

        {/* Archive View */}
        {viewMode === 'archive' && <ArchiveView />}
      </div>
    )
}