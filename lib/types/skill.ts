export interface Skill {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
}

export interface ListSkillsOptions {
    search?: string;
    limit?: number;
    offset?: number;
}

export interface CreateSkillData {
    name: string;
    slug: string;
}
