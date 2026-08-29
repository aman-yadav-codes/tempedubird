"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  ArrowLeft,
  BookOpen,
  ShoppingBag,
  FileCheck2,
  Building2,
  Users,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function ParentSearchHistoryPage() {
  const { accessToken } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = () => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    fetch("/api/parent/search-history", { headers })
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
          <Link href="/parent/children" className="text-xs font-bold text-primary flex items-center gap-1 mb-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to My Children
          </Link>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            Family & Child Search History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor learning topics, practice test queries, and study materials searched by you and your linked children.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/student/products">
            <Button size="sm" className="font-bold text-xs gap-1.5 shadow-2xs">
              <ShoppingBag className="h-4 w-4" /> Recommended Supplies
            </Button>
          </Link>
        </div>
      </div>

      {/* SEARCH LIST */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading family search history...</div>
      ) : history.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-card border-border rounded-2xl">
          <Search className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No search history recorded</h3>
          <p className="text-xs text-muted-foreground">Searches by your children will appear here to help you guide their learning journey.</p>
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
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 shrink-0">
                      {item.user_role_label || "Child Activity"}
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
                    {item.searched_by_name && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-foreground">{item.searched_by_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Link href={`/courses?search=${encodeURIComponent(item.query)}`}>
                  <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-bold gap-1 text-primary hover:text-primary">
                    <span>Inspect</span> <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
