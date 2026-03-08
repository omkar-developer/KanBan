import { create } from "zustand";

import type { Board } from "../models/Board";
import type { Column } from "../models/Column";
import type { Task } from "../models/Task";

import { store } from "../storage/indexeddbStore";
import { createId } from "../utils/id";

interface KanbanState {

  boards: Board[]
  columns: Column[]
  tasks: Task[]

  activeBoard?: string

  loadBoards: () => Promise<void>
  loadBoard: (boardId: string) => Promise<void>

  createBoard: (name: string) => Promise<void>
  createColumn: (boardId: string, name: string) => Promise<void>
  createTask: (columnId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>

}

export const useKanbanStore = create<KanbanState>((set, get) => ({

  boards: [],
  columns: [],
  tasks: [],

  activeBoard: undefined,

  async loadBoards() {

    const boards = await store.getBoards()

    set({ boards })

  },

  async loadBoard(boardId) {

    const columns = await store.getColumns(boardId)

    const tasksArrays = await Promise.all(
      columns.map(col => store.getTasks(col.id))
    )

    const tasks = tasksArrays.flat()

    set({
      activeBoard: boardId,
      columns,
      tasks
    })

  },

  async createBoard(name) {

    const id = createId()

    await store.createBoard({
      id,
      name,
      createdAt: Date.now()
    })

    await get().loadBoards()

  },

  async createColumn(boardId, name) {

    const id = createId()

    await store.createColumn({
      id,
      boardId,
      name,
      order: 0
    })

    const columns = await store.getColumns(boardId)

    set({ columns })

  },

  async createTask(columnId, title) {

    const id = createId()

    await store.createTask({
      id,
      columnId,
      title,
      order: 0,
      createdAt: Date.now()
    })

    const tasks = await store.getTasks(columnId)

    set(state => ({
      tasks: [
        ...state.tasks.filter(t => t.columnId !== columnId),
        ...tasks
      ]
    }))

  },

  async updateTask(taskId, updates) {

    const task = get().tasks.find(t => t.id === taskId)
    
    if (!task) return

    await store.updateTask({
      ...task,
      ...updates,
      updatedAt: Date.now()
    })

    set(state => ({
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
      )
    }))

  },

  async deleteTask(taskId) {

    await store.deleteTask(taskId)

    set(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId)
    }))

  }

}));