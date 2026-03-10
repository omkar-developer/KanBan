export type BoardType = "kanban" | "notes" | "tools";

export interface Board {
    id: string;
    name: string;
    type: BoardType;
    category?: string;
    createdAt: number;
    updatedAt?: number;
    description?: string;
    color?: string;
    archived?: boolean;
}