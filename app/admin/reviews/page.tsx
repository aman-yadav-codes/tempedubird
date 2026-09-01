"use client";

import { useEffect, useState } from "react";
import {
  Star,
  MessageSquareHeart,
  Building,
  GraduationCap,
  Users,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Flag,
  Trash2,
  CheckCircle2,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type ReviewItem = {
  id: number;
  institution_id: number;
  institution_name: string;
  program_title?: string;
  reviewer_name: string;
  reviewer_role: string;
  is_verified_user: boolean;
  rating: number;
  academic_rating?: number;
  faculty_rating?: number;
  infrastructure_rating?: number;
  support_rating?: number;
  title?: string;
  comment: string;
  status: string;
  institution_reply?: string;
  institution_replied_at?: string;
  created_at: string;
};

type InstitutionOption = {
  id: number;
  name: string;
};

type ReviewStats = {
  total_reviews: number;
  avg_rating: number;
  avg_academic: number;
  avg_faculty: number;
  avg_infrastructure: number;
  avg_support: number;
  star_counts: Record<number, number>;
  student_count: number;
  parent_count: number;
  replied_count: number;
};

export default function PlatformAdminReviewsPage() {
  const { accessToken } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedInstId, setSelectedInstId] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchAllReviews = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const params = new URLSearchParams({ scope: "all" });
      if (selectedInstId !== "all") params.set("institutionId", selectedInstId);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { headers });
      const json = await res.json();
      if (res.ok) {
        setReviews(json.reviews || []);
        setStats(json.stats || null);
        setInstitutions(json.institutions || []);
      } else {
        toast.error(json.error || "Failed to load platform reviews");
      }
    } catch {
      toast.error("Network error loading platform reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, [accessToken, selectedInstId, ratingFilter, roleFilter, statusFilter]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Review status changed to ${newStatus}`);
        fetchAllReviews();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to update review status");
      }
    } catch {
      toast.error("Error updating review");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast.success("Review permanently removed");
        fetchAllReviews();
      }
    } catch {
      toast.error("Error deleting review");
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchInst = r.institution_name?.toLowerCase().includes(q);
      const matchName = r.reviewer_name?.toLowerCase().includes(q);
      const matchComment = r.comment?.toLowerCase().includes(q);
      const matchTitle = r.title?.toLowerCase().includes(q);
      if (!matchInst && !matchName && !matchComment && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-purple-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Platform Global Governance & Moderation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Platform-Wide Reviews & Feedback Moderation
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Super Admin oversight across all registered institutions. Audit student & parent reviews, monitor institutional response rates, and enforce platform community guidelines.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllReviews}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Sync Platform Records
            </Button>
          </div>
        </div>
      </div>

      {/* PLATFORM METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Reviews</p>
              <h3 className="text-2xl font-black text-foreground">{stats?.total_reviews || 0}</h3>
              <p className="text-[11px] text-muted-foreground">Platform-wide total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Star className="h-6 w-6 fill-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Average</p>
              <h3 className="text-2xl font-black text-foreground">{stats?.avg_rating || "5.0"} ★</h3>
              <p className="text-[11px] text-muted-foreground">Across all institutions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institutions</p>
              <h3 className="text-2xl font-black text-foreground">{institutions.length}</h3>
              <p className="text-[11px] text-muted-foreground">Active profiles</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institution Responses</p>
              <h3 className="text-2xl font-black text-foreground">{stats?.replied_count || 0}</h3>
              <p className="text-[11px] text-muted-foreground">Leadership replies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search institution, student, parent, review..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Institution selector */}
          <select
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3 max-w-[200px]"
          >
            <option value="all">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={String(inst.id)}>
                {inst.name}
              </option>
            ))}
          </select>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* REVIEWS STREAM */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Fetching global review stream...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-border p-12 text-center space-y-3">
            <MessageSquareHeart className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No Platform Reviews Found</h3>
            <p className="text-xs text-muted-foreground">Try clearing your filters.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((r) => (
              <Card key={r.id} className="rounded-2xl border-border bg-card shadow-xs overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-sm shrink-0">
                        {r.institution_name?.charAt(0) || "I"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-foreground">{r.institution_name}</h4>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold",
                              r.reviewer_role?.toLowerCase().includes("parent")
                                ? "text-indigo-600 bg-indigo-500/5 border-indigo-500/20"
                                : "text-primary bg-primary/5 border-primary/20"
                            )}
                          >
                            {r.reviewer_role}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[10px] font-bold capitalize",
                              r.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : r.status === "flagged"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {r.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="font-semibold">{r.program_title || "Academic Program"}</span>
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-600 text-xs font-extrabold mr-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{r.rating}.0</span>
                      </div>

                      {/* Moderation Controls */}
                      {r.status !== "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(r.id, "published")}
                          className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 cursor-pointer"
                          title="Publish Review"
                        >
                          <Eye className="h-3.5 w-3.5" /> Publish
                        </Button>
                      )}

                      {r.status !== "flagged" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(r.id, "flagged")}
                          className="h-8 text-xs font-bold gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-50 cursor-pointer"
                          title="Flag Review"
                        >
                          <Flag className="h-3.5 w-3.5" /> Flag
                        </Button>
                      )}

                      {r.status !== "hidden" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(r.id, "hidden")}
                          className="h-8 text-xs font-bold gap-1 text-muted-foreground border-border hover:bg-muted cursor-pointer"
                          title="Hide Review"
                        >
                          <EyeOff className="h-3.5 w-3.5" /> Hide
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(r.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sub-ratings */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-muted/40 p-2 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Academics</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.academic_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Faculty</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.faculty_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Infrastructure</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.infrastructure_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Support</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.support_rating || r.rating}.0
                      </p>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1">
                    {r.title && <h5 className="text-sm font-bold text-foreground">{r.title}</h5>}
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                  </div>

                  {/* Official Response */}
                  {r.institution_reply && (
                    <div className="mt-3 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                          <Building className="h-4 w-4 text-purple-600" />
                          <span>Official Institution Response ({r.institution_name})</span>
                        </div>
                        {r.institution_replied_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.institution_replied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 italic pl-1 border-l-2 border-purple-500/40">
                        &ldquo;{r.institution_reply}&rdquo;
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
