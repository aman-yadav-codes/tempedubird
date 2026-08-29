export type LocationType = "country" | "state" | "city" | "area";
export type LocationScope = "global" | "seo" | "user" | "institution";

export interface Location {
  id: number;
  name: string;
  slug: string;
  type: LocationType;
  parent_id: number | null;
  parent_name: string | null;
  country_name?: string | null;
  state_name?: string | null;
  city_name?: string | null;
  area_name?: string | null;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  location_scope: LocationScope;
}

export interface ListLocationsOptions {
  search?: string;
  limit?: number;
  offset?: number;
  scopes?: string[];
  type?: string;
}

export interface CreateLocationData {
  name: string;
  slug: string;
  type: LocationType;
  parent_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  location_scope?: LocationScope;
}
