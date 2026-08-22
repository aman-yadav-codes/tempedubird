"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Image as ImageIcon,
  Building2,
  BookOpen,
  Laptop,
  Users,
  Award,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  School,
  Sparkles,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";

type GalleryItem = {
  id: number;
  institution_id: number;
  institution_name: string;
  media_type: string;
  category_slug?: string;
  category_name?: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
};

const DEFAULT_ALBUM_CATEGORIES = [
  { key: "all", label: "All Photos" },
  { key: "campus", label: "Campus & Architecture" },
  { key: "labs", label: "Laboratories & Tech" },
  { key: "library", label: "Central Library" },
  { key: "hostels", label: "Hostels & Living" },
  { key: "classrooms", label: "Smart Classrooms" },
  { key: "events", label: "Events & Fests" },
];

export function GalleryPageView() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();

  const instIdParam = searchParams.get("institutionId") || searchParams.get("inst");
  const resolvedInstId = instIdParam ? Number(instIdParam) : activeInstitutionId || user?.memberships?.[0]?.institution_id;

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>(DEFAULT_ALBUM_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadGallery() {
      setLoading(true);
      try {
        const url = resolvedInstId
          ? `/api/public/gallery?institutionId=${resolvedInstId}`
          : "/api/public/gallery";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setGalleryItems(json.data || []);
          if (Array.isArray(json.categories) && json.categories.length > 0) {
            setCategories(json.categories);
          }
        }
      } catch (err) {
        console.error("Failed to load gallery:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, [resolvedInstId]);

  const filteredItems = selectedCategory === "all"
    ? galleryItems
    : galleryItems.filter(
        (item) =>
          item.category_slug?.toLowerCase() === selectedCategory ||
          item.category_name?.toLowerCase() === selectedCategory ||
          item.media_type?.toLowerCase() === selectedCategory ||
          item.category?.toLowerCase() === selectedCategory ||
          item.title?.toLowerCase().includes(selectedCategory)
      );

  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const handleNextLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  };

  const handlePrevLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Header */}
      <section className="border-b border-border bg-gradient-to-b from-card/80 via-card/40 to-background py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-[#800000] border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Campus Photo Gallery</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Life & Infrastructure at Campus
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Explore our world-class academic infrastructure, high-tech research labs, smart lecture halls, campus hostels, and vibrant student activities.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-8">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-[#800000] text-white shadow-md shadow-rose-950/20"
                      : "bg-card text-foreground hover:bg-muted border border-border"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Gallery Grid */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Sparkles className="h-6 w-6 animate-spin mr-2 text-primary" /> Loading campus photo gallery...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-card space-y-3">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-bold text-foreground">No photos found in this category</h3>
            <p className="text-xs text-muted-foreground">Select another category or view all photos.</p>
            <Button size="sm" onClick={() => setSelectedCategory("all")}>
              View All Photos
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setLightboxIndex(idx)}
                className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <Image
                    src={item.url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="text-white space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        <Maximize2 className="h-3.5 w-3.5" /> Click to enlarge
                      </span>
                      <p className="text-xs text-slate-200 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </div>

                {/* Card Title & Badge */}
                <div className="p-4 space-y-1 border-t bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {item.category_name || item.media_type || "Campus"}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handlePrevLightbox}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={handleNextLightbox}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center text-center space-y-4">
            <div className="relative h-[65vh] w-[80vw] max-w-4xl">
              <Image
                src={activeLightboxItem.url}
                alt={activeLightboxItem.title}
                fill
                sizes="100vw"
                className="object-contain rounded-xl"
              />
            </div>
            <div className="text-white space-y-1 max-w-2xl px-4">
              <h3 className="text-lg font-bold">{activeLightboxItem.title}</h3>
              {activeLightboxItem.description && (
                <p className="text-xs text-slate-300">{activeLightboxItem.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
