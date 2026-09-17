"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export type FavoriteItem = {
  id?: number | string;
  entity_type: string;
  entity_id: string | number;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  target_url?: string | null;
  badge?: string | null;
  price?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
};

const LOCAL_STORAGE_KEY = "edubird_guest_favorites";
const FAVORITES_CHANGE_EVENT = "edubird_favorites_updated";

function getLocalFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalFavorites(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
  } catch {}
}

export function useFavorites() {
  const { accessToken, user } = useAuthStore();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!accessToken) {
      setFavorites(getLocalFavorites());
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setFavorites(json.data);

        // Sync any guest favorites to account if present
        const local = getLocalFavorites();
        if (local.length > 0) {
          for (const item of local) {
            const alreadyInDb = json.data.some(
              (f: FavoriteItem) =>
                f.entity_type === item.entity_type &&
                String(f.entity_id) === String(item.entity_id)
            );
            if (!alreadyInDb) {
              fetch("/api/favorites", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ ...item, action: "add" }),
              }).catch(() => {});
            }
          }
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
    } catch (e) {
      setFavorites(getLocalFavorites());
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchFavorites();

    const handleUpdate = () => {
      if (!accessToken) {
        setFavorites(getLocalFavorites());
      } else {
        fetchFavorites();
      }
    };

    window.addEventListener(FAVORITES_CHANGE_EVENT, handleUpdate);
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, handleUpdate);
  }, [fetchFavorites, accessToken]);

  const isFavorite = useCallback(
    (entityType: string, entityId: string | number) => {
      const normType = String(entityType).toLowerCase().trim();
      const normId = String(entityId).trim();
      return favorites.some(
        (f) =>
          String(f.entity_type).toLowerCase().trim() === normType &&
          String(f.entity_id).trim() === normId
      );
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: FavoriteItem): Promise<boolean> => {
      const normType = String(item.entity_type).toLowerCase().trim();
      const normId = String(item.entity_id).trim();
      const currentlyFavorited = isFavorite(normType, normId);
      const newStatus = !currentlyFavorited;

      // Optimistic update
      if (currentlyFavorited) {
        setFavorites((prev) =>
          prev.filter(
            (f) =>
              !(
                String(f.entity_type).toLowerCase().trim() === normType &&
                String(f.entity_id).trim() === normId
              )
          )
        );
      } else {
        setFavorites((prev) => [
          {
            ...item,
            entity_type: normType,
            entity_id: normId,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      if (!accessToken) {
        // Guest mode via localStorage
        const local = getLocalFavorites();
        let updated: FavoriteItem[];
        if (currentlyFavorited) {
          updated = local.filter(
            (f) =>
              !(
                String(f.entity_type).toLowerCase().trim() === normType &&
                String(f.entity_id).trim() === normId
              )
          );
          toast.success("Removed from favorites");
        } else {
          updated = [
            {
              ...item,
              entity_type: normType,
              entity_id: normId,
              created_at: new Date().toISOString(),
            },
            ...local,
          ];
          toast.success("Saved to favorites!");
        }
        setLocalFavorites(updated);
        return newStatus;
      }

      // Logged in: Sync with API
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...item,
            entity_type: normType,
            entity_id: normId,
            action: "toggle",
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));

        if (json.favorited) {
          toast.success("Saved to your favorites!");
        } else {
          toast.success("Removed from favorites");
        }
        return Boolean(json.favorited);
      } catch (err: any) {
        fetchFavorites();
        toast.error(err.message || "Failed to update favorite");
        return currentlyFavorited;
      }
    },
    [accessToken, isFavorite, fetchFavorites]
  );

  const removeFavorite = useCallback(
    async (entityType: string, entityId: string | number, id?: number | string) => {
      const normType = String(entityType).toLowerCase().trim();
      const normId = String(entityId).trim();

      setFavorites((prev) =>
        prev.filter(
          (f) =>
            !(
              String(f.entity_type).toLowerCase().trim() === normType &&
              String(f.entity_id).trim() === normId
            )
        )
      );

      if (!accessToken) {
        const local = getLocalFavorites().filter(
          (f) =>
            !(
              String(f.entity_type).toLowerCase().trim() === normType &&
              String(f.entity_id).trim() === normId
            )
        );
        setLocalFavorites(local);
        toast.success("Removed from favorites");
        return;
      }

      try {
        const url = id
          ? `/api/favorites?id=${id}`
          : `/api/favorites?type=${normType}&entity_id=${normId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to remove favorite");
        window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
        toast.success("Removed from favorites");
      } catch (err: any) {
        fetchFavorites();
        toast.error(err.message || "Failed to remove favorite");
      }
    },
    [accessToken, fetchFavorites]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    refetch: fetchFavorites,
  };
}
