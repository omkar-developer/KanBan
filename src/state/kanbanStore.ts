import { create } from "zustand"
import type { Board }    from "../models/Board"
import type { Column }   from "../models/Column"
import type { Task }     from "../models/Task"
import type { Comment }  from "../models/Comment"
import { store }         from "../storage/indexeddbStore"
import { createId }      from "../utils/id"

interface KanbanState {
  boards:      Board[]
  columns:     Column[]
  tasks:       Task[]
  activeBoard?: string

  loadBoards:  () => Promise<void>
  loadBoard:   (boardId: string) => Promise<void>

  createBoard: (name: string) => Promise<void>
  createColumn:(boardId: string, name: string) => Promise<void>
  updateColumn:(column: Column) => Promise<void>
  deleteColumn:(columnId: string) => Promise<void>

  createTask:  (columnId: string, title: string) => Promise<void>
  updateTask:  (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask:  (taskId: string) => Promise<void>

  reorderTasksOptimistic: (taskId: string, toColumnId: string, toIndex: number) => void
  persistTaskOrder:       (columnIds: string[]) => Promise<void>
  moveColumn:             (columnId: string, toIndex: number) => Promise<void>

  getComments:   (taskId: string)    => Promise<Comment[]>
  createComment: (comment: Comment)  => Promise<string>
  deleteComment: (commentId: string) => Promise<void>
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  boards: [], columns: [], tasks: [], activeBoard: undefined,

  async loadBoards() {
    const boards = await store.getBoards()
    set({ boards })
  },

  async loadBoard(boardId) {
    const columns = await store.getColumns(boardId)
    const sorted  = [...columns].sort((a, b) => a.order - b.order)
    const taskArrays = await Promise.all(sorted.map(c => store.getTasks(c.id)))
    const tasks = taskArrays.flat().sort((a, b) => a.order - b.order)
    set({ activeBoard: boardId, columns: sorted, tasks })
  },

  async createBoard(name) {
    const id = createId()
    await store.createBoard({ id, name, createdAt: Date.now() })
    await get().loadBoards()
  },

  async createColumn(boardId, name) {
    const id = createId()
    const existing = get().columns.filter(c => c.boardId === boardId)
    const order = existing.length > 0
      ? Math.max(...existing.map(c => c.order)) + 1000
      : 1000
    await store.createColumn({ id, boardId, name, order })
    const cols = await store.getColumns(boardId)
    set({ columns: [...cols].sort((a, b) => a.order - b.order) })
  },

  async updateColumn(column) {
    await store.updateColumn(column)
    set(s => ({ columns: s.columns.map(c => c.id === column.id ? column : c) }))
  },

  async deleteColumn(columnId) {
    await store.deleteColumn(columnId)
    set(s => ({
      columns: s.columns.filter(c => c.id !== columnId),
      tasks:   s.tasks.filter(t => t.columnId !== columnId),
    }))
  },

  async createTask(columnId, title) {
    const id = createId()
    const existing = get().tasks.filter(t => t.columnId === columnId)
    const order = existing.length > 0
      ? Math.max(...existing.map(t => t.order)) + 1000
      : 1000
    const task: Task = { id, columnId, title, order, createdAt: Date.now() }
    await store.createTask(task)
    set(s => ({ tasks: [...s.tasks, task] }))
  },

  async updateTask(taskId, updates) {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return
    const updated = { ...task, ...updates, updatedAt: Date.now() }
    await store.updateTask(updated)
    set(s => ({ tasks: s.tasks.map(t => t.id === taskId ? updated : t) }))
  },

  async deleteTask(taskId) {
    await store.deleteTask(taskId)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== taskId) }))
  },

  // Called from BoardView.onDragEnd — updates Zustand state only (no DB write).
  // persistTaskOrder is called immediately after to write to IndexedDB.
  reorderTasksOptimistic(taskId, toColumnId, toIndex) {
    set(s => {
      const task = s.tasks.find(t => t.id === taskId)
      if (!task) return s

      const fromColumnId = task.columnId

      // Remove task from its current position
      const without = s.tasks.filter(t => t.id !== taskId)

      // Insert into destination column at toIndex
      const destTasks = without
        .filter(t => t.columnId === toColumnId)
        .sort((a, b) => a.order - b.order)
      destTasks.splice(toIndex, 0, { ...task, columnId: toColumnId })
      const destRepacked = destTasks.map((t, i) => ({ ...t, order: (i + 1) * 1000 }))

      // Repack source column if cross-column move
      let srcRepacked: Task[] = []
      if (fromColumnId !== toColumnId) {
        srcRepacked = without
          .filter(t => t.columnId === fromColumnId)
          .sort((a, b) => a.order - b.order)
          .map((t, i) => ({ ...t, order: (i + 1) * 1000 }))
      }

      const untouched = without.filter(
        t => t.columnId !== toColumnId && t.columnId !== fromColumnId
      )

      return { tasks: [...untouched, ...destRepacked, ...srcRepacked] }
    })
  },

  // Writes the current in-memory order for the given columns to IndexedDB.
  async persistTaskOrder(columnIds) {
    const tasks = get().tasks.filter(t => columnIds.includes(t.columnId))
    await Promise.all(tasks.map(t => store.updateTask({ ...t, updatedAt: Date.now() })))
  },

  async moveColumn(columnId, toIndex) {
    const sorted = [...get().columns].sort((a, b) => a.order - b.order)
    const from   = sorted.findIndex(c => c.id === columnId)
    if (from === -1) return
    const [moved] = sorted.splice(from, 1)
    sorted.splice(toIndex, 0, moved)
    const updated = sorted.map((c, i) => ({ ...c, order: (i + 1) * 1000 }))
    set({ columns: updated })
    await Promise.all(updated.map(c => store.updateColumn(c)))
  },

  async getComments(taskId)     { return store.getComments(taskId) },
  async createComment(comment)  { return store.createComment(comment) },
  async deleteComment(id)       { return store.deleteComment(id) },
}))