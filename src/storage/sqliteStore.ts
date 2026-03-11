/**
 * SQLite implementation of Store — used only in Tauri.
 * Uses @tauri-apps/plugin-sql which wraps SQLite via Rust.
 *
 * The DB file lives at: {appLocalDataDir}/taskflow.db
 * Schema mirrors the Dexie schema exactly so all models are compatible.
 */

import type { Store } from "./store"
import type { Board } from "../models/Board"
import type { Column } from "../models/Column"
import type { Task } from "../models/Task"
import type { Comment } from "../models/Comment"

// ── DB singleton ──────────────────────────────────────────────────────────────

let _db: import("@tauri-apps/plugin-sql").default | null = null

async function getDb() {
  if (_db) return _db

  const Database = (await import("@tauri-apps/plugin-sql")).default
  _db = await Database.load("sqlite:taskflow.db")
  await migrate(_db)
  return _db
}

// ── Migrations ────────────────────────────────────────────────────────────────

async function migrate(db: import("@tauri-apps/plugin-sql").default) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT,
      category   TEXT,
      data       TEXT,
      createdAt  INTEGER NOT NULL,
      updatedAt  INTEGER NOT NULL
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS columns (
      id       TEXT PRIMARY KEY,
      boardId  TEXT NOT NULL,
      name     TEXT NOT NULL,
      "order"  INTEGER NOT NULL DEFAULT 0,
      data     TEXT,
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id        TEXT PRIMARY KEY,
      columnId  TEXT NOT NULL,
      title     TEXT NOT NULL,
      "order"   INTEGER NOT NULL DEFAULT 0,
      data      TEXT,
      tags      TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (columnId) REFERENCES columns(id) ON DELETE CASCADE
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id        TEXT PRIMARY KEY,
      taskId    TEXT NOT NULL,
      content   TEXT NOT NULL,
      data      TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `)
  // Enable foreign keys (SQLite requires this per connection)
  await db.execute("PRAGMA foreign_keys = ON;")
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialise extra fields into the `data` JSON column */
function packBoard(b: Board) {
  const { id, name, type, category, createdAt, updatedAt, ...rest } = b
  return {
    id,
    name: name ?? "",
    type: type ?? null,
    category: category ?? null,
    data: Object.keys(rest).length ? JSON.stringify(rest) : null,
    createdAt: createdAt ?? Date.now(),
    updatedAt: updatedAt ?? Date.now(),
  }
}

function unpackBoard(row: Record<string, unknown>): Board {
  const extra = row.data ? JSON.parse(row.data as string) : {}
  return { ...extra, id: row.id, name: row.name, type: row.type, category: row.category, createdAt: row.createdAt, updatedAt: row.updatedAt }
}

function packColumn(c: Column) {
  const { id, boardId, name, order, ...rest } = c
  return {
    id,
    boardId,
    name: name ?? "",
    order: order ?? 0,
    data: Object.keys(rest).length ? JSON.stringify(rest) : null,
  }
}

function unpackColumn(row: Record<string, unknown>): Column {
  const extra = row.data ? JSON.parse(row.data as string) : {}
  return { ...extra, id: row.id, boardId: row.boardId, name: row.name, order: row.order }
}

function packTask(t: Task) {
  const { id, columnId, title, order, tags, createdAt, updatedAt, ...rest } = t
  return {
    id,
    columnId,
    title: title ?? "",
    order: order ?? 0,
    tags: tags?.length ? JSON.stringify(tags) : null,
    data: Object.keys(rest).length ? JSON.stringify(rest) : null,
    createdAt: createdAt ?? Date.now(),
    updatedAt: updatedAt ?? Date.now(),
  }
}

function unpackTask(row: Record<string, unknown>): Task {
  const extra = row.data ? JSON.parse(row.data as string) : {}
  return {
    ...extra,
    id: row.id,
    columnId: row.columnId,
    title: row.title,
    order: row.order,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function packComment(c: Comment) {
  const { id, taskId, content, createdAt, ...rest } = c
  return {
    id,
    taskId,
    content: content ?? "",
    data: Object.keys(rest).length ? JSON.stringify(rest) : null,
    createdAt: createdAt ?? Date.now(),
  }
}

function unpackComment(row: Record<string, unknown>): Comment {
  const extra = row.data ? JSON.parse(row.data as string) : {}
  return { ...extra, id: row.id, taskId: row.taskId, content: row.content, createdAt: row.createdAt }
}

// ── Store implementation ──────────────────────────────────────────────────────

export const sqliteStore: Store = {

  // ── Boards ────────────────────────────────────────────────────────────────

  async getBoards(): Promise<Board[]> {
    const db = await getDb()
    const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM boards ORDER BY createdAt ASC")
    return rows.map(unpackBoard)
  },

  async createBoard(board: Board): Promise<string> {
    const db = await getDb()
    const p = packBoard(board)
    await db.execute(
      `INSERT INTO boards (id, name, type, category, data, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [p.id, p.name, p.type, p.category, p.data, p.createdAt, p.updatedAt]
    )
    return board.id
  },

  async updateBoard(board: Board): Promise<void> {
    const db = await getDb()
    const p = packBoard({ ...board, updatedAt: Date.now() })
    await db.execute(
      `UPDATE boards SET name=$1, type=$2, category=$3, data=$4, updatedAt=$5 WHERE id=$6`,
      [p.name, p.type, p.category, p.data, p.updatedAt, p.id]
    )
  },

  async deleteBoard(boardId: string): Promise<void> {
    const db = await getDb()
    // CASCADE handles columns → tasks → comments via FK
    await db.execute("DELETE FROM boards WHERE id=$1", [boardId])
  },

  // ── Columns ───────────────────────────────────────────────────────────────

  async getColumns(boardId: string): Promise<Column[]> {
    const db = await getDb()
    const rows = await db.select<Record<string, unknown>[]>(
      `SELECT * FROM columns WHERE boardId=$1 ORDER BY "order" ASC`,
      [boardId]
    )
    return rows.map(unpackColumn)
  },

  async createColumn(column: Column): Promise<string> {
    const db = await getDb()
    if (column.order === undefined) {
      const rows = await db.select<Record<string, unknown>[]>(
        `SELECT MAX("order") as maxOrder FROM columns WHERE boardId=$1`,
        [column.boardId]
      )
      column.order = ((rows[0]?.maxOrder as number | undefined) ?? 0) + 1
    }
    const p = packColumn(column)
    await db.execute(
      `INSERT INTO columns (id, boardId, name, "order", data) VALUES ($1, $2, $3, $4, $5)`,
      [p.id, p.boardId, p.name, p.order, p.data]
    )
    return column.id
  },

  async updateColumn(column: Column): Promise<void> {
    const db = await getDb()
    const p = packColumn(column)
    await db.execute(
      `UPDATE columns SET boardId=$1, name=$2, "order"=$3, data=$4 WHERE id=$5`,
      [p.boardId, p.name, p.order, p.data, p.id]
    )
  },

  async deleteColumn(columnId: string): Promise<void> {
    const db = await getDb()
    await db.execute("DELETE FROM columns WHERE id=$1", [columnId])
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────

  async getTasks(columnId: string): Promise<Task[]> {
    const db = await getDb()
    const rows = await db.select<Record<string, unknown>[]>(
      `SELECT * FROM tasks WHERE columnId=$1 ORDER BY "order" ASC`,
      [columnId]
    )
    return rows.map(unpackTask)
  },

  async createTask(task: Task): Promise<string> {
    const db = await getDb()
    if (task.order === undefined) {
      const rows = await db.select<Record<string, unknown>[]>(
        `SELECT MAX("order") as maxOrder FROM tasks WHERE columnId=$1`,
        [task.columnId]
      )
      task.order = ((rows[0]?.maxOrder as number | undefined) ?? 0) + 1
    }
    const p = packTask({ ...task, createdAt: task.createdAt ?? Date.now(), updatedAt: Date.now() })
    await db.execute(
      `INSERT INTO tasks (id, columnId, title, "order", tags, data, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [p.id, p.columnId, p.title, p.order, p.tags, p.data, p.createdAt, p.updatedAt]
    )
    return task.id
  },

  async updateTask(task: Task): Promise<void> {
    const db = await getDb()
    const p = packTask({ ...task, updatedAt: Date.now() })
    await db.execute(
      `UPDATE tasks SET columnId=$1, title=$2, "order"=$3, tags=$4, data=$5, updatedAt=$6 WHERE id=$7`,
      [p.columnId, p.title, p.order, p.tags, p.data, p.updatedAt, p.id]
    )
  },

  async deleteTask(taskId: string): Promise<void> {
    const db = await getDb()
    await db.execute("DELETE FROM tasks WHERE id=$1", [taskId])
  },

  // ── Comments ──────────────────────────────────────────────────────────────

  async getComments(taskId: string): Promise<Comment[]> {
    const db = await getDb()
    const rows = await db.select<Record<string, unknown>[]>(
      "SELECT * FROM comments WHERE taskId=$1 ORDER BY createdAt ASC",
      [taskId]
    )
    return rows.map(unpackComment)
  },

  async createComment(comment: Comment): Promise<string> {
    const db = await getDb()
    const p = packComment(comment)
    await db.execute(
      `INSERT INTO comments (id, taskId, content, data, createdAt) VALUES ($1, $2, $3, $4, $5)`,
      [p.id, p.taskId, p.content, p.data, p.createdAt]
    )
    return comment.id
  },

  async deleteComment(commentId: string): Promise<void> {
    const db = await getDb()
    await db.execute("DELETE FROM comments WHERE id=$1", [commentId])
  },
}