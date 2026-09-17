"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites, type FavoriteItem } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export type FavoriteButtonProps = {
  entityType: "institute" | "course" | "teacher" | "product" | "exam" | "note" | "practice" | string;
  entityId: string | number;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
  badge?: string | null;
  price?: string | null;
  metadata?: Record<string, any>;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  variant?: "floating" | "inline" | "ghost";
};

export function FavoriteButton({
  entityType,
  entityId,
  title,
  subtitle,
  imageUrl,
  targetUrl,
  badge,
  price,
  metadata,
  size = "md",
  className,
  showLabel = false,
  variant = "floating",
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [animating, setAnimating] = useState(false);

  const favorited = isFavorite(entityType, entityId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setAnimating(true);
    setTimeout(() => setAnimating(false), 350);

    const item: FavoriteItem = {
      entity_type: entityType,
      entity_id: entityId,
      title: title || undefined,
      subtitle: subtitle || undefined,
      image_url: imageUrl || undefined,
      target_url: targetUrl || undefined,
      badge: badge || undefined,
      price: price || undefined,
      metadata: metadata || undefined,
    };

    await toggleFavorite(item);
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8.5 w-8.5",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={favorited ? "Remove from favorites" : "Save to favorites"}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none",
          favorited
            ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400 shadow-xs"
            : "bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/80",
          animating && "scale-105",
          className
        )}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-transform duration-200",
            favorited && "fill-rose-500 text-rose-500",
            animating && "scale-125"
          )}
        />
        {showLabel && <span>{favorited ? "Favorited" : "Favorite"}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      title={favorited ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-md select-none",
        variant === "floating"
          ? "bg-background/90 hover:bg-background border border-border/80 hover:border-rose-400/50 hover:shadow-md"
          : "bg-muted/60 hover:bg-muted text-muted-foreground",
        sizeClasses[size],
        favorited
          ? "text-rose-500 border-rose-300 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/80"
          : "text-muted-foreground hover:text-rose-500",
        animating && "scale-115 ring-2 ring-rose-400/30",
        className
      )}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all duration-200",
          favorited ? "fill-rose-500 text-rose-500" : "group-hover:scale-110",
          animating && "scale-125"
        )}
      />
    </button>
  );
}
