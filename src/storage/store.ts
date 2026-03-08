import type { Board } from '../models/Board';
import type { Column } from '../models/Column';
import type { Task } from '../models/Task';
import type { Comment } from '../models/Comment';

export interface Store {
  // Boards
  getBoards(): Promise<Board[]>;
  createBoard(board: Board): Promise<string>;
  updateBoard(board: Board): Promise<void>;
  deleteBoard(boardId: string): Promise<void>;

  // Columns
  getColumns(boardId: string): Promise<Column[]>;
  createColumn(column: Column): Promise<string>;
  updateColumn(column: Column): Promise<void>;
  deleteColumn(columnId: string): Promise<void>;

  // Tasks
  getTasks(columnId: string): Promise<Task[]>;
  createTask(task: Task): Promise<string>;
  updateTask(task: Task): Promise<void>;
  deleteTask(taskId: string): Promise<void>;

  // Comments
  getComments(taskId: string): Promise<Comment[]>;
  createComment(comment: Comment): Promise<string>;
  deleteComment(commentId: string): Promise<void>;
}
