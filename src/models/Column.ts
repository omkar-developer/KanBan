export interface Column {
    id: string;
    boardId: string;
    name: string;
    order: number;
    icon?: string;
    color?: string;
    hidden?: boolean;
    width?: number; // 1, 1.5, 2 multiplier; default 1
    sortKey?: string; // "order", "title", "priority", "dueDate", "createdAt"
    sortDir?: "asc" | "desc";
    filterPriority?: string; // "all", "low", "medium", "high", "critical"
    filterType?: string; // "all", "task", "feature", "bug", "note", "checklist"
}