export interface Column {
    id: string;
    boardId: string;
    name: string;
    order: number;
    icon?: string;
    color?: string;
    hidden?: boolean;
    width?: number; // 1, 1.5, 2 multiplier; default 1
}