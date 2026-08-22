"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Calendar, Building2, Search, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

type BlogItem = {
  id: number;
  title: string;
  body: string;
  category: string;
  created_at: string;
  institution_name: string;
  price: string;
  is_free: boolean;
};

export default function BlogsPublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBlogs();
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const url =
        isInstitutionalAdmin && activeInstitutionId
          ? `/api/public/blogs?institutionId=${activeInstitutionId}`
          : "/api/public/blogs";

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBlogs(json.blogs || []);
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.body.toLowerCase().includes(search.toLowerCase()) ||
      b.institution_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Articles & Campus Blogs" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-rose-600" />
              <span>Campus News & Academic Blogs</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Educational Articles & Updates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Read insights, campus announcements, student advice, and academic trends.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles or news..."
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading articles...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground space-y-3">
            <p className="font-semibold text-foreground">No articles found.</p>
            <p className="text-xs">
              {isInstitutionalAdmin
                ? "Your institution has not published any blog posts or news announcements yet."
                : "No marketplace blogs available matching your search."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <Card
                key={b.id}
                className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {b.category || "Campus Update"}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                      Free Access
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-foreground leading-snug">{b.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{b.body}</p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[200px]">
                    <Building2 className="h-3.5 w-3.5 text-primary shrink-0" /> {b.institution_name}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    Read Post <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
