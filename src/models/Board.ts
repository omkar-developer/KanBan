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
    favorite?: boolean;
    icon?: string;
}

export function createBoard(name: string, type?: BoardType, category?: string, icon?: string): Board {
    return {
        id: crypto.randomUUID(),
        name,
        type: type || "kanban",
        category: category || undefined,
        icon: icon || undefined,
        createdAt: Date.now(),
    };
}