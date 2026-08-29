"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Building2,
  Search,
  Loader2,
  Sparkles,
  ArrowRight,
  Clock,
  Eye,
  Star,
  BookOpen,
  User,
  Share2,
  Tag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

type BlogItem = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  cover_image?: string;
  tags?: string;
  is_featured?: boolean;
  read_time_mins?: number;
  views_count?: number;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  institution_name?: string;
  institution_slug?: string;
  institution_logo?: string;
  published_at: string;
};

const CATEGORIES = [
  "All Categories",
  "Academic & Curriculum",
  "Admissions & Counseling",
  "Campus Life & Culture",
  "Exams, Cutoffs & Results",
  "Placements & Career",
  "Scholarships & Financial Aid",
  "Technology & Innovation",
];

export default function BlogsPublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

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

  const filtered = blogs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.summary && b.summary.toLowerCase().includes(search.toLowerCase())) ||
      (b.institution_name && b.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      (b.tags && b.tags.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All Categories" || b.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredPost = blogs.find((b) => b.is_featured) || blogs[0];
  const regularPosts = filtered.filter((b) => b.id !== (selectedCategory === "All Categories" && !search ? featuredPost?.id : null));

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="container mx-auto px-4 max-w-7xl space-y-8">
        <SeoBreadcrumbs items={[{ label: "Articles & Campus Blogs" }]} />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/80 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Campus News, Articles & Insights</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Educational Articles & Campus Journal
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Explore accredited syllabus guides, career roadmaps, exam cutoffs, faculty research, and campus stories.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles, topics or tags..."
              className="pl-10 text-xs h-10 rounded-xl bg-card"
            />
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full text-xs font-bold shrink-0 cursor-pointer ${
                selectedCategory === cat ? "shadow-xs" : "bg-card hover:bg-muted"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-sm text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">Loading educational articles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center text-muted-foreground space-y-4 border-dashed rounded-2xl">
            <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-foreground text-base">No articles found.</p>
              <p className="text-xs">Try adjusting your search query or selecting another category.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All Categories");
              }}
              className="text-xs font-bold rounded-xl"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* Hero Featured Article (Shown when no search/category filter is active) */}
            {selectedCategory === "All Categories" && !search && featuredPost && (
              <Card className="overflow-hidden border-border/80 bg-card rounded-2xl shadow-md group hover:border-primary/50 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  <div className="relative h-64 sm:h-80 lg:h-auto lg:col-span-6 overflow-hidden bg-muted">
                    <img
                      src={
                        featuredPost.cover_image ||
                        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80"
                      }
                      alt={featuredPost.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-1">
                        Featured Article
                      </Badge>
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-xs text-foreground font-bold text-xs">
                        {featuredPost.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 lg:col-span-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {featuredPost.read_time_mins || 5} min read
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(featuredPost.published_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-snug group-hover:text-primary transition-colors">
                        <Link href={`/blogs/${featuredPost.slug || featuredPost.id}`}>
                          {featuredPost.title}
                        </Link>
                      </h2>

                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {featuredPost.summary}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                          {(featuredPost.author_name || "A").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-foreground">
                            {featuredPost.author_name || "EduBird Specialist"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {featuredPost.author_role || (featuredPost.institution_name ?? "Campus Contributor")}
                          </p>
                        </div>
                      </div>

                      <Button asChild size="sm" className="font-bold text-xs gap-1.5 rounded-xl">
                        <Link href={`/blogs/${featuredPost.slug || featuredPost.id}`}>
                          Read Article <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Articles Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {(selectedCategory === "All Categories" && !search ? regularPosts : filtered).map((post) => (
                <Card
                  key={post.id}
                  className="overflow-hidden border-border/80 bg-card rounded-2xl shadow-xs hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      <img
                        src={
                          post.cover_image ||
                          "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"
                        }
                        alt={post.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur-xs text-foreground font-bold text-[10px]">
                          {post.category || "Campus"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" />
                          {post.read_time_mins || 5} min
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(post.published_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        <Link href={`/blogs/${post.slug || post.id}`}>{post.title}</Link>
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[170px]">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(post.author_name || "A").slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[11px] text-foreground truncate">
                          {post.author_name || "EduBird Faculty"}
                        </span>
                      </div>

                      <Link
                        href={`/blogs/${post.slug || post.id}`}
                        className="font-bold text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        Read Post <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
