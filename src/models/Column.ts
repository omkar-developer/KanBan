export interface Column {
    id: string;
    boardId: string;
    name: string;
    order: number;
    icon?: string;
    color?: string;
    hidden?: boolean;
}