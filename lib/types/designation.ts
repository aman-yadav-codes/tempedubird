export interface Designation {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
}

export interface ListDesignationsOptions {
    search?: string;
    limit?: number;
    offset?: number;
}

export interface CreateDesignationData {
    name: string;
    slug: string;
}
