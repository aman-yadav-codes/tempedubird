"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Search,
  ExternalLink,
  Trash2,
  Building2,
  BookOpen,
  GraduationCap,
  ShoppingBag,
  Award,
  BookMarked,
  CheckSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useFavorites } from "@/hooks/use-favorites";

const CATEGORIES = [
  { key: "all", label: "All Items", icon: Sparkles },
  { key: "institute", label: "Institutes", icon: Building2, exploreUrl: "/institutes" },
  { key: "course", label: "Courses", icon: BookOpen, exploreUrl: "/courses" },
  { key: "teacher", label: "Teachers", icon: GraduationCap, exploreUrl: "/teachers" },
  { key: "product", label: "Products", icon: ShoppingBag, exploreUrl: "/products" },
  { key: "exam", label: "Exams", icon: Award, exploreUrl: "/exams" },
  { key: "note", label: "Notes", icon: BookMarked, exploreUrl: "/notes" },
  { key: "practice", label: "Practice Tests", icon: CheckSquare, exploreUrl: "/practice" },
];

export function FavoritesView() {
  const { favorites, loading, removeFavorite } = useFavorites();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { all: favorites.length };
    for (const f of favorites) {
      const t = String(f.entity_type).toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      if (activeCategory !== "all" && String(item.entity_type).toLowerCase() !== activeCategory) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const subMatch = item.subtitle?.toLowerCase().includes(query);
        const typeMatch = item.entity_type?.toLowerCase().includes(query);
        return titleMatch || subMatch || typeMatch;
      }
      return true;
    });
  }, [favorites, activeCategory, search]);

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "institute":
        return <Building2 className="h-4 w-4 text-rose-600" />;
      case "course":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "teacher":
        return <GraduationCap className="h-4 w-4 text-purple-600" />;
      case "product":
        return <ShoppingBag className="h-4 w-4 text-amber-600" />;
      case "exam":
        return <Award className="h-4 w-4 text-emerald-600" />;
      case "note":
        return <BookMarked className="h-4 w-4 text-cyan-600" />;
      case "practice":
        return <CheckSquare className="h-4 w-4 text-indigo-600" />;
      default:
        return <Sparkles className="h-4 w-4 text-rose-600" />;
    }
  };

  const getFallbackUrl = (type: string, id: string | number) => {
    switch (type.toLowerCase()) {
      case "institute":
        return `/institutes/${id}`;
      case "course":
        return `/courses/${id}`;
      case "teacher":
        return "/teachers";
      case "product":
        return "/products";
      case "exam":
        return "/exams";
      case "note":
        return "/notes";
      case "practice":
        return "/practice";
      default:
        return "/";
    }
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
            <Heart className="h-3.5 w-3.5 fill-rose-500" />
            <span>Personal Bookmarks</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            My Favorites
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access and manage your saved institutes, courses, teachers, academic products, exams, notes, and practice tests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 font-bold bg-muted/40">
            {favorites.length} Saved {favorites.length === 1 ? "Item" : "Items"}
          </Badge>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="space-y-4">
        {/* Horizontal Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = countsByType[cat.key] || 0;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search within favorites */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeCategory === "all" ? "all favorites" : activeCategory + "s"}...`}
            className="pl-10 h-10 text-xs rounded-xl bg-card border-border"
          />
        </div>
      </div>

      {/* FAVORITES GRID */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-rose-500 animate-pulse" />
          <span>Loading your favorites...</span>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-4 bg-card border-border border-dashed">
          <div className="p-4 bg-rose-500/10 text-rose-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Heart className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">
              {search
                ? "No matching favorites found"
                : activeCategory === "all"
                ? "No favorites saved yet"
                : `No saved ${activeCategory}s yet`}
            </h3>
            <p className="text-xs max-w-md mx-auto leading-relaxed">
              {search
                ? "Try searching for a different keyword or clear the search bar."
                : "Click the heart icon on any listing across EduBird to quickly find and revisit it here anytime."}
            </p>
          </div>

          {currentCategoryObj?.exploreUrl && (
            <Link href={currentCategoryObj.exploreUrl} className="inline-block pt-2">
              <Button size="sm" className="font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl">
                <span>Explore {currentCategoryObj.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFavorites.map((item) => {
            const target = item.target_url || getFallbackUrl(item.entity_type, item.entity_id);
            return (
              <Card
                key={`${item.entity_type}-${item.entity_id}`}
                className="group relative overflow-hidden bg-card border-border hover:border-rose-500/40 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between"
              >
                <div>
                  {item.image_url ? (
                    <div className="relative h-40 w-full overflow-hidden bg-muted">
                      <Image
                        src={item.image_url}
                        alt={item.title || "Favorite item"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-background/90 backdrop-blur-md text-foreground border-border/80 text-[10px] font-bold flex items-center gap-1.5 capitalize">
                          {getEntityIcon(item.entity_type)}
                          <span>{item.entity_type}</span>
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFavorite(item.entity_type, item.entity_id, item.id)}
                        title="Remove from favorites"
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/90 backdrop-blur-md text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <Badge className="bg-muted text-foreground border-border text-[10px] font-bold flex items-center gap-1.5 capitalize">
                        {getEntityIcon(item.entity_type)}
                        <span>{item.entity_type}</span>
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeFavorite(item.entity_type, item.entity_id, item.id)}
                        title="Remove from favorites"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <h3 className="font-extrabold text-base text-foreground line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                      {item.title || "Untitled Item"}
                    </h3>

                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {item.badge && (
                        <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                          {item.badge}
                        </Badge>
                      )}
                      {item.price && (
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                          {item.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-border/60 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Saved"}
                  </span>
                  <Link href={target}>
                    <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-bold gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                      <span>View Details</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
