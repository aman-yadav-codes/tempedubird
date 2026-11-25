"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Search,
  RefreshCw,
  Building2,
  Trash2,
  ExternalLink,
  Store,
  MapPin,
  Briefcase,
  Package,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerSalesTabs } from "./customer-sales-tabs";
import { toast } from "sonner";

interface Favorite {
  id: number;
  target_type: string;
  business_id?: number;
  professional_id?: number;
  product_id?: number;
  service_id?: number;
  business_name?: string;
  business_city?: string;
  business_type?: string;
  business_logo?: string;
  professional_name?: string;
  professional_city?: string;
  profession_type?: string;
  professional_avatar?: string;
  created_at: string;
}

export function CustomerFavoritesView() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [search, setSearch] = useState("");

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/favorites");
      const json = await res.json();
      if (res.ok && json.data) {
        setFavorites(json.data);
      } else {
        setFavorites([]);
      }
    } catch {
      toast.error("Failed to load saved favorites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (id: number) => {
    try {
      const res = await fetch(`/api/customer/favorites?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Removed from favorites");
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      } else {
        toast.error("Failed to remove item");
      }
    } catch {
      toast.error("Network error while removing favorite");
    }
  };

  const filtered = favorites.filter((f) => {
    const q = search.toLowerCase();
    const name = (f.business_name || f.professional_name || "").toLowerCase();
    const city = (f.business_city || f.professional_city || "").toLowerCase();
    return name.includes(q) || city.includes(q);
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Sales Navigation Tabs */}
      <CustomerSalesTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Heart className="size-5 text-rose-500 fill-rose-500" /> My Saved Favorites
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quickly access your saved businesses, stores, trusted professionals, and preferred services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 text-xs">
            <Link href="/explore">
              <Search className="size-3.5 mr-1.5" /> Explore Varanasi Directory
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={loadFavorites} className="h-9 text-xs">
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search saved favorites by name or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <Card className="rounded-xl border shadow-xs py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
          Loading your favorites...
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border shadow-xs py-16 text-center text-muted-foreground">
          <Heart className="size-10 mx-auto mb-3 opacity-30 text-rose-500" />
          <p className="text-sm font-semibold text-foreground">No saved favorites yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click the heart icon on any business, store, or service profile to save it here for quick access anytime.
          </p>
          <Button asChild size="sm" className="mt-4 text-xs bg-primary text-white">
            <Link href="/explore">Discover Businesses</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="rounded-xl border shadow-xs hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 border flex items-center justify-center shrink-0">
                      {item.target_type === "professional" ? (
                        <Briefcase className="size-5 text-primary" />
                      ) : (
                        <Store className="size-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {item.business_name || item.professional_name || "Saved Item"}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="size-3 shrink-0" />
                        <span>{item.business_city || item.professional_city || "Varanasi"}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    onClick={() => handleRemove(item.id)}
                    title="Remove from favorites"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <Badge variant="outline" className="text-[11px] capitalize">
                    {item.target_type || "Directory"}
                  </Badge>

                  <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Link
                      href={
                        item.business_id
                          ? `/business/${item.business_id}`
                          : item.professional_id
                          ? `/professional/${item.professional_id}`
                          : "/explore"
                      }
                      target="_blank"
                    >
                      <span>View Profile</span>
                      <ExternalLink className="size-3 opacity-60" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
