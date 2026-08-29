"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  User,
  Users,
  Building2,
  BookOpen,
  ShoppingBag,
  FileCheck2,
  Filter,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export default function AdminSearchHistoryPage() {
  const { accessToken } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const fetchSearchHistory = useCallback(() => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter !== "all") params.set("type", typeFilter);

    fetch(`/api/admin/marketing/search-history?${params.toString()}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHistory(data.history || []);
          setTotal(data.total || 0);
          setPageCount(data.pageCount || 1);
        }
      })
      .catch(() => toast.error("Failed to load platform search logs"))
      .finally(() => setLoading(false));
  }, [accessToken, page, search, typeFilter]);

  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "courses":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "exams":
        return <FileCheck2 className="h-4 w-4 text-indigo-500" />;
      case "products":
        return <ShoppingBag className="h-4 w-4 text-emerald-500" />;
      case "institutes":
        return <Building2 className="h-4 w-4 text-amber-500" />;
      default:
        return <Search className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Search className="w-4 h-4" />
            <span>Visitor Intelligence & High-Intent Queries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            Platform Search History & Discovery Logs
            <Badge variant="secondary" className="text-xs font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
              {total} Queries Logged
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            Live search stream showing whatever students, parents, and visitors are searching across courses, entrance exams, institutions, notes, and study kits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/marketing/business-analytics">
            <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 shadow-2xs">
              <TrendingUp className="h-4 w-4 text-primary" /> Business Analytics Hub
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSearchHistory}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search queries, user name, email, phone..."
            className="pl-9 text-xs h-9 bg-background rounded-lg"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Entity Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="courses">Courses</SelectItem>
              <SelectItem value="exams">Exams & Tests</SelectItem>
              <SelectItem value="products">Products & Kits</SelectItem>
              <SelectItem value="institutes">Institutes</SelectItem>
              <SelectItem value="notes">Notes & LMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SEARCH LOGS LIST */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading platform search logs...</div>
      ) : history.length === 0 ? (
        <Card className="p-8 text-center space-y-2 bg-card border-border rounded-2xl">
          <Search className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No search queries match filters</h3>
          <p className="text-xs text-muted-foreground">Try adjusting your search criteria or entity type filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="p-4 bg-card border-border shadow-xs hover:border-primary/40 transition-all rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Query Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                    {getEntityIcon(item.entity_type)}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground truncate">
                        "{item.query}"
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                        {item.entity_type}
                      </Badge>
                      {item.category && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-muted/40">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 font-bold text-foreground">
                        <User className="h-3 w-3 text-primary" />
                        {item.user_name} {item.user_role ? `(${item.user_role})` : ""}
                      </span>
                      {item.user_email && <span>• {item.user_email}</span>}
                      {item.user_phone && <span>• {item.user_phone}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at || Date.now()).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Results Count & Action */}
                <div className="flex items-center gap-3 shrink-0 sm:border-l sm:pl-4 border-border">
                  <div className="text-right sm:text-center">
                    <span className="font-black text-primary text-sm block">
                      {item.results_count || 0}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Results</span>
                  </div>
                  <Link href={`/courses?search=${encodeURIComponent(item.query)}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold text-primary hover:text-primary gap-1">
                      <span>View</span> <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
          <span className="text-muted-foreground">
            Page <strong>{page}</strong> of <strong>{pageCount}</strong> ({total} total searches)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs font-bold gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="h-8 px-2.5 text-xs font-bold gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
