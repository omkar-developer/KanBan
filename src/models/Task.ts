export type TaskType = "task" | "note" | "checklist" | "bug" | "feature";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
    id: string;
    columnId: string;
    title: string;
    description?: string;
    order: number;
    createdAt: number;
    updatedAt?: number;
    type?: TaskType;
    data?: Record<string, unknown>;
    priority?: TaskPriority;
    tags?: string[];
    dueDate?: number;
    attachments?: string[];
}