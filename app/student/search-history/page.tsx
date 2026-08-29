"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  Trash2,
  ArrowLeft,
  BookOpen,
  ShoppingBag,
  FileCheck2,
  Building2,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export default function StudentSearchHistoryPage() {
  const { accessToken } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = () => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    fetch("/api/student/search-history", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [accessToken]);

  const clearHistory = (id?: number) => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const url = id ? `/api/student/search-history?id=${id}` : `/api/student/search-history`;
    fetch(url, { method: "DELETE", headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          toast.success(id ? "Search item removed" : "All search history cleared");
          loadHistory();
        }
      })
      .catch(() => toast.error("Failed to clear search history"));
  };

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
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/student/dashboard" className="text-xs font-bold text-primary flex items-center gap-1 mb-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Search className="h-6 w-6 text-primary" />
            My Search & Discovery History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your past queries are securely saved to recommend relevant courses, study kits, mock tests, and LMS materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearHistory()}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All History
            </Button>
          )}
        </div>
      </div>

      {/* SEARCH LIST */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading search history...</div>
      ) : history.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-card border-border rounded-2xl">
          <Search className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No search history found</h3>
          <p className="text-xs text-muted-foreground">When you search for courses, exams, or study tools, your history will appear here.</p>
          <Link href="/courses">
            <Button size="sm" className="font-bold text-xs mt-2">Explore Courses</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="p-4 bg-card border-border shadow-2xs hover:border-primary/40 transition-all rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  {getEntityIcon(item.entity_type)}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground truncate">{item.query}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {item.entity_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at || Date.now()).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.category && (
                      <>
                        <span>•</span>
                        <span>{item.category}</span>
                      </>
                    )}
                    {item.results_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">{item.results_count} results found</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/courses?search=${encodeURIComponent(item.query)}`}>
                  <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-bold gap-1 text-primary hover:text-primary">
                    <span>Search Again</span> <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearHistory(item.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
