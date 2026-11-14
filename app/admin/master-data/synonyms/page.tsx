"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Sparkles,
  Search,
  Plus,
  X,
  Tag,
  Package,
  Briefcase,
  Layers,
  Building2,
  UserCheck,
  Check,
  Loader2,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

interface SynonymItem {
  id: number;
  entityType: "product" | "service" | "category" | "business" | "professional";
  name: string;
  slug: string;
  subtitle?: string;
  category_name?: string;
  synonyms: string[];
  updated_at?: string;
}

export default function SynonymsDictionaryPage() {
  const { accessToken } = useAuthStore();
  const [activeType, setActiveType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SynonymItem[]>([]);

  // Inline Quick Add state
  const [inlineAddId, setInlineAddId] = useState<string | null>(null);
  const [inlineSynonymText, setInlineSynonymText] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<SynonymItem | null>(null);
  const [editingSynonymsText, setEditingSynonymsText] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // Fetch items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeType === "all" ? "" : `&type=${activeType}`;
      const qParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : "";
      const res = await fetch(`/api/admin/synonyms?limit=100${typeParam}${qParam}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load synonyms");
      setItems(data.items || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load synonym items");
    } finally {
      setLoading(false);
    }
  }, [activeType, searchQuery, accessToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadItems]);

  // Handle Quick Add Single Synonym
  const handleQuickAdd = async (item: SynonymItem, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inlineSynonymText.trim();
    if (!clean) return;

    setInlineSaving(true);
    try {
      const res = await fetch("/api/admin/synonyms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          entityType: item.entityType,
          entityId: item.id,
          newSynonym: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add synonym");

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.entityType === item.entityType
            ? { ...it, synonyms: data.synonyms }
            : it
        )
      );
      toast.success(`Added synonym "${clean}" to ${item.name}`);
      setInlineSynonymText("");
      setInlineAddId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to add synonym");
    } finally {
      setInlineSaving(false);
    }
  };

  // Handle Remove Single Synonym
  const handleRemoveSynonym = async (item: SynonymItem, synonymToRemove: string) => {
    try {
      const res = await fetch(
        `/api/admin/synonyms?entityType=${item.entityType}&entityId=${item.id}&synonym=${encodeURIComponent(
          synonymToRemove
        )}`,
        {
          method: "DELETE",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove synonym");

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.entityType === item.entityType
            ? { ...it, synonyms: data.synonyms }
            : it
        )
      );
      toast.success(`Removed synonym "${synonymToRemove}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete synonym");
    }
  };

  // Open Full Edit Modal
  const openEditModal = (item: SynonymItem) => {
    setEditingItem(item);
    setEditingSynonymsText(item.synonyms.join(", "));
  };

  // Save Full Edit Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setModalSaving(true);
    try {
      const res = await fetch("/api/admin/synonyms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          entityType: editingItem.entityType,
          entityId: editingItem.id,
          synonyms: editingSynonymsText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update synonyms");

      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id && it.entityType === editingItem.entityType
            ? { ...it, synonyms: data.synonyms }
            : it
        )
      );
      toast.success(`Updated synonyms for ${editingItem.name}`);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save synonyms");
    } finally {
      setModalSaving(false);
    }
  };

  // Type Icon and Badge Helper
  const getTypeBadge = (type: SynonymItem["entityType"]) => {
    switch (type) {
      case "product":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px] font-bold gap-1">
            <Package className="size-3" /> Product
          </Badge>
        );
      case "service":
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 text-[10px] font-bold gap-1">
            <Briefcase className="size-3" /> Service
          </Badge>
        );
      case "category":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px] font-bold gap-1">
            <Layers className="size-3" /> Category
          </Badge>
        );
      case "business":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold gap-1">
            <Building2 className="size-3" /> Business
          </Badge>
        );
      case "professional":
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 text-[10px] font-bold gap-1">
            <UserCheck className="size-3" /> Professional
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Synonyms &amp; Keyword Dictionary
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure regional aliases (e.g. potato → batata, aaloo), keywords, and synonyms to ensure customers find products, services, categories, and profiles instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadItems}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name, subtitle, or existing synonym..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Type Tabs */}
        <Tabs value={activeType} onValueChange={setActiveType}>
          <TabsList className="bg-muted/60 p-1 h-9">
            <TabsTrigger value="all" className="text-xs font-semibold px-3 py-1">
              All
            </TabsTrigger>
            <TabsTrigger value="product" className="text-xs font-semibold px-3 py-1">
              Products
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs font-semibold px-3 py-1">
              Services
            </TabsTrigger>
            <TabsTrigger value="category" className="text-xs font-semibold px-3 py-1">
              Categories
            </TabsTrigger>
            <TabsTrigger value="business" className="text-xs font-semibold px-3 py-1">
              Businesses
            </TabsTrigger>
            <TabsTrigger value="professional" className="text-xs font-semibold px-3 py-1">
              Professionals
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Items List */}
      {loading && items.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="size-8 mx-auto text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading synonym dictionary entries...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border bg-card">
          <Sparkles className="size-10 mx-auto text-muted-foreground opacity-40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Items Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            No products, services, categories, or profiles matched your filter criteria. Try clearing the search or changing category tab.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const rowKey = `${item.entityType}-${item.id}`;
            const isAddingInline = inlineAddId === rowKey;

            return (
              <Card
                key={rowKey}
                className="rounded-2xl border shadow-2xs hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Entity Information */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.entityType)}
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {item.name}
                      </h3>
                      {item.category_name && (
                        <span className="text-[11px] text-muted-foreground">
                          • {item.category_name}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}

                    {/* Synonyms Tags Container */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      {item.synonyms.length === 0 ? (
                        <span className="text-xs italic text-muted-foreground">
                          No synonyms configured yet (search matches exact name only).
                        </span>
                      ) : (
                        item.synonyms.map((syn, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/80 transition-colors group"
                          >
                            <Tag className="size-2.5 text-primary opacity-60" />
                            <span>{syn}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSynonym(item, syn)}
                              className="size-3.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                              title={`Remove "${syn}"`}
                            >
                              <X className="size-2.5" />
                            </button>
                          </span>
                        ))
                      )}

                      {/* Inline Quick Add Input or Button */}
                      {isAddingInline ? (
                        <form
                          onSubmit={(e) => handleQuickAdd(item, e)}
                          className="inline-flex items-center gap-1 animate-in fade-in"
                        >
                          <Input
                            autoFocus
                            placeholder="e.g. batata"
                            value={inlineSynonymText}
                            onChange={(e) => setInlineSynonymText(e.target.value)}
                            className="h-6 w-32 text-xs px-2 py-0"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={inlineSaving || !inlineSynonymText.trim()}
                            className="h-6 px-2 text-[10px] font-bold bg-primary text-primary-foreground"
                          >
                            {inlineSaving ? <Loader2 className="size-2.5 animate-spin" /> : <Check className="size-3" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInlineAddId(null);
                              setInlineSynonymText("");
                            }}
                            className="h-6 px-1.5 text-muted-foreground"
                          >
                            <X className="size-3" />
                          </Button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineAddId(rowKey);
                            setInlineSynonymText("");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-primary hover:bg-primary/10 border border-primary/30 transition-colors cursor-pointer"
                        >
                          <Plus className="size-2.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="text-xs font-bold gap-1.5 h-8 px-3"
                    >
                      <Edit2 className="size-3" />
                      Manage All
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit All Synonyms Modal */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveModal}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {editingItem && getTypeBadge(editingItem.entityType)}
                <DialogTitle className="text-base font-bold">
                  Edit Synonyms: {editingItem?.name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter comma-separated or space-separated search synonyms. For example, for potato enter: <strong>batata, aaloo, alu, potatoes</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Synonyms &amp; Search Keywords</Label>
                <textarea
                  rows={4}
                  value={editingSynonymsText}
                  onChange={(e) => setEditingSynonymsText(e.target.value)}
                  placeholder="batata, potato, potatoes, aloo, aaloo, alu"
                  className="w-full text-xs p-3 rounded-xl border border-input bg-background shadow-2xs focus:outline-primary leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate synonyms with commas. Any customer search matching any of these keywords will show <strong>{editingItem?.name}</strong>.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={modalSaving}
                className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                {modalSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Save Synonyms
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

