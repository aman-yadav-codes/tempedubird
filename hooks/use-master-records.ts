"use client";

import { useEffect, useState, useCallback } from "react";

export type MasterRecord = {
  id: number;
  vertical_id: number;
  vertical_code: string;
  master_type_id: number;
  master_type_code: string;
  master_type_name: string;
  parent_id: number | null;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  display_order: number;
  status: "active" | "inactive" | "archived";
  metadata?: Record<string, any>;
  attributes?: Record<string, any>;
};

export type UseMasterRecordsOptions = {
  vertical?: string;
  type?: string;
  parentId?: number | string | null;
  search?: string;
  includeInactive?: boolean;
  enabled?: boolean;
};

export function useMasterRecords({
  vertical,
  type,
  parentId,
  search,
  includeInactive = false,
  enabled = true,
}: UseMasterRecordsOptions) {
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!enabled || (!vertical && !type)) {
      setRecords([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (vertical) params.set("vertical", vertical);
      if (type) params.set("type", type);
      if (parentId !== undefined && parentId !== null && parentId !== "") {
        params.set("parentId", String(parentId));
      }
      if (search) params.set("search", search);
      if (includeInactive) params.set("includeInactive", "true");

      const res = await fetch(`/api/masters?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load master records");
      setRecords(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load master records");
    } finally {
      setLoading(false);
    }
  }, [vertical, type, parentId, search, includeInactive, enabled]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}
