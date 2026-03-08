export interface Board {
    id: string;
    name: string;
    createdAt: number;
    updatedAt?: number;
    description?: string;
    color?: string;
    archived?: boolean;
}