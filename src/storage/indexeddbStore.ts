import { db } from "./db";
import type { Store } from "./store";

import type { Board } from "../models/Board";
import type { Column } from "../models/Column";
import type { Task } from "../models/Task";
import type { Comment } from "../models/Comment";

export const indexedDbStore: Store = {

  // =====================
  // BOARDS
  // =====================

  async getBoards(): Promise<Board[]> {
    return db.boards.orderBy("createdAt").toArray()
  },

  async createBoard(board: Board): Promise<string> {
    const now = Date.now()

    await db.boards.add({
      ...board,
      createdAt: board.createdAt ?? now,
      updatedAt: now
    })

    return board.id
  },

  async updateBoard(board: Board): Promise<void> {
    await db.boards.put({
      ...board,
      updatedAt: Date.now()
    });
  },

  async deleteBoard(boardId: string): Promise<void> {

    await db.transaction(
      "rw",
      db.boards,
      db.columns,
      db.tasks,
      db.comments,
      async () => {

        const columns = await db.columns
          .where("boardId")
          .equals(boardId)
          .toArray();

        const columnIds = columns.map(c => c.id);

        const tasks = columnIds.length
          ? await db.tasks.where("columnId").anyOf(columnIds).toArray()
          : [];

        const taskIds = tasks.map(t => t.id);

        if (taskIds.length) {
          await db.comments.where("taskId").anyOf(taskIds).delete();
        }

        if (columnIds.length) {
          await db.tasks.where("columnId").anyOf(columnIds).delete();
          await db.columns.where("boardId").equals(boardId).delete();
        }

        await db.boards.delete(boardId);
      }
    );
  },


  // =====================
  // COLUMNS
  // =====================

  async getColumns(boardId: string): Promise<Column[]> {
    const columns = await db.columns
      .where("boardId")
      .equals(boardId)
      .toArray();

    return columns.sort((a, b) => a.order - b.order);
  },

  async createColumn(column: Column): Promise<string> {

  if (column.order === undefined) {

    const columns = await db.columns
      .where("boardId")
      .equals(column.boardId)
      .sortBy("order");

    const last = columns[columns.length - 1];

    column.order = last ? last.order + 1 : 1;
  }

  await db.columns.add(column);

  return column.id;
},

  async updateColumn(column: Column): Promise<void> {
    await db.columns.put(column);
  },

  async deleteColumn(columnId: string): Promise<void> {

    await db.transaction(
      "rw",
      db.columns,
      db.tasks,
      db.comments,
      async () => {

        const tasks = await db.tasks
          .where("columnId")
          .equals(columnId)
          .toArray();

        const taskIds = tasks.map(t => t.id);

        if (taskIds.length) {
          await db.comments.where("taskId").anyOf(taskIds).delete();
        }

        await db.tasks.where("columnId").equals(columnId).delete();
        await db.columns.delete(columnId);
      }
    );
  },


  // =====================
  // TASKS
  // =====================

  async getTasks(columnId: string): Promise<Task[]> {
    const tasks = await db.tasks
      .where("columnId")
      .equals(columnId)
      .toArray();

    return tasks.sort((a, b) => a.order - b.order);
  },

  async createTask(task: Task): Promise<string> {

    const now = Date.now();

    if (task.order === undefined) {

      const tasks = await db.tasks
        .where("columnId")
        .equals(task.columnId)
        .sortBy("order");

      const last = tasks[tasks.length - 1];

      task.order = last ? last.order + 1 : 1;
    }

    await db.tasks.add({
      ...task,
      createdAt: task.createdAt ?? now,
      updatedAt: now
    });

    return task.id;
  },

  async updateTask(task: Task): Promise<void> {
    await db.tasks.put({
      ...task,
      updatedAt: Date.now()
    });
  },

  async deleteTask(taskId: string): Promise<void> {

    await db.transaction(
      "rw",
      db.tasks,
      db.comments,
      async () => {

        await db.comments.where("taskId").equals(taskId).delete();
        await db.tasks.delete(taskId);

      }
    );
  },


  // =====================
  // COMMENTS
  // =====================

  async getComments(taskId: string): Promise<Comment[]> {
    return db.comments
      .where("taskId")
      .equals(taskId)
      .sortBy("createdAt");
  },

  async createComment(comment: Comment): Promise<string> {
  await db.comments.add({
    ...comment,
    createdAt: comment.createdAt ?? Date.now()
  });

  return comment.id;
},

  async deleteComment(commentId: string): Promise<void> {
    await db.comments.delete(commentId);
  }

};

export const store = indexedDbStore;