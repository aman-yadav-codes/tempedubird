export type CertificationProviderType =
  | "certification"
  | "affiliation"
  | "accreditation"
  | "board"
  | "industry_partner"
  | "government_body"
  | "other";

export interface CertificationProvider {
  id: number;
  name: string;
  slug: string;
  provider_type: CertificationProviderType | string;
  code?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  description?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ListCertificationProvidersOptions {
  search?: string;
  provider_type?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCertificationProviderData {
  name: string;
  slug: string;
  provider_type?: CertificationProviderType | string;
  code?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateCertificationProviderData {
  name?: string;
  slug?: string;
  provider_type?: CertificationProviderType | string;
  code?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
}
