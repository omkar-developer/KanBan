import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Board } from '../models/Board';
import type { Column } from '../models/Column';
import type { Task } from '../models/Task';
import type{ Comment } from '../models/Comment';

export class KanbanDB extends Dexie {
  boards!: Table<Board>;
  columns!: Table<Column>;
  tasks!: Table<Task>;
  comments!: Table<Comment>;

  constructor() {
    super('kanbanDB');
    this.version(1).stores({
      boards: 'id, &createdAt, +type, +category',
      columns: 'id, boardId, order',
      tasks: 'id, columnId, order, createdAt',
      comments: 'id, taskId, createdAt',
    });
  }
}

export const db = new KanbanDB();
