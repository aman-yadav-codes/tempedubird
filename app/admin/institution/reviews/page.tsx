"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  MessageSquareHeart,
  Building,
  GraduationCap,
  Users,
  Search,
  Filter,
  Reply,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Send,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  pending_reply_count: number;
};

export default function InstitutionAdminReviewsPage() {
  const { user, accessToken } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [replyFilter, setReplyFilter] = useState<string>("all");

  // Reply Dialog State
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchInstitutionReviews = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const params = new URLSearchParams({ scope: "institution" });
      if (search.trim()) params.set("search", search.trim());
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { headers });
      const json = await res.json();
      if (res.ok) {
        setReviews(json.reviews || []);
        setStats(json.stats || null);
      } else {
        toast.error(json.error || "Failed to load institution reviews");
      }
    } catch {
      toast.error("Network error loading reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutionReviews();
  }, [accessToken, ratingFilter, roleFilter]);

  const handleOpenReply = (review: ReviewItem) => {
    setSelectedReview(review);
    setReplyText(review.institution_reply || "");
    setReplyDialogOpen(true);
  };

  const handlePublishReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    if (!replyText.trim()) {
      toast.error("Reply text cannot be empty.");
      return;
    }

    setSubmittingReply(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/reviews/${selectedReview.id}/reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Official response published and delivered to submitter!");
        setReplyDialogOpen(false);
        fetchInstitutionReviews();
      } else {
        toast.error(json.error || "Failed to post reply");
      }
    } catch {
      toast.error("Error publishing reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Filtered in-memory for replyFilter & search
  const filteredReviews = reviews.filter((r) => {
    if (replyFilter === "replied" && !r.institution_reply) return false;
    if (replyFilter === "pending" && r.institution_reply) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.reviewer_name?.toLowerCase().includes(q);
      const matchComment = r.comment?.toLowerCase().includes(q);
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchProgram = r.program_title?.toLowerCase().includes(q);
      if (!matchName && !matchComment && !matchTitle && !matchProgram) return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 p-6 md:p-8 text-white shadow-xl border border-rose-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
              <Building className="h-3.5 w-3.5" />
              <span>Maa Sharda Institute PVT LTD • Quality & Reputation Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Institution Reviews & Student/Parent Feedback
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Review feedback and ratings submitted by enrolled students and parents. Respond officially to inquiries, praise faculty, and address suggestions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInstitutionReviews}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Sync Feedback
            </Button>
          </div>
        </div>
      </div>

      {/* RATING BREAKDOWN & PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating Score Card */}
        <Card className="rounded-3xl border-border bg-card shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Satisfaction</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                Active Rating
              </Badge>
            </div>
            <div className="flex items-baseline gap-3 mt-4">
              <h2 className="text-5xl font-black text-foreground">{stats?.avg_rating || "5.0"}</h2>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-500" />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                  Based on {stats?.total_reviews || 0} reviews
                </span>
              </div>
            </div>
          </div>

          {/* Submitter Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border/60 mt-4">
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/40">
              <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Students
              </p>
              <p className="text-xl font-black text-foreground mt-1">{stats?.student_count || 0}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/40">
              <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-600" /> Parents
              </p>
              <p className="text-xl font-black text-foreground mt-1">{stats?.parent_count || 0}</p>
            </div>
          </div>
        </Card>

        {/* Category Metrics Card */}
        <Card className="rounded-3xl border-border bg-card shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Category Score Breakdown
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Academic Quality & Curriculum</span>
                <span className="text-amber-500 font-extrabold">{stats?.avg_academic || "5.0"} ★</span>
              </div>
              <Progress value={((stats?.avg_academic || 5) / 5) * 100} className="h-2 bg-muted" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Faculty & Teaching Excellence</span>
                <span className="text-amber-500 font-extrabold">{stats?.avg_faculty || "5.0"} ★</span>
              </div>
              <Progress value={((stats?.avg_faculty || 5) / 5) * 100} className="h-2 bg-muted" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Campus Infrastructure & Labs</span>
                <span className="text-amber-500 font-extrabold">{stats?.avg_infrastructure || "5.0"} ★</span>
              </div>
              <Progress value={((stats?.avg_infrastructure || 5) / 5) * 100} className="h-2 bg-muted" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Student Support & Doubts</span>
                <span className="text-amber-500 font-extrabold">{stats?.avg_support || "5.0"} ★</span>
              </div>
              <Progress value={((stats?.avg_support || 5) / 5) * 100} className="h-2 bg-muted" />
            </div>
          </div>
        </Card>

        {/* Response & Star Distribution */}
        <Card className="rounded-3xl border-border bg-card shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Leadership Response Rate
            </h3>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              {stats?.total_reviews
                ? `${Math.round(((stats?.replied_count || 0) / stats.total_reviews) * 100)}% Replied`
                : "100%"}
            </Badge>
          </div>

          <div className="space-y-2 pt-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats?.star_counts?.[star] || 0;
              const pct = stats?.total_reviews ? Math.round((count / stats.total_reviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-10 font-bold text-muted-foreground">{star} Stars</span>
                  <Progress value={pct} className="h-2 flex-1 bg-muted" />
                  <span className="w-8 text-right font-semibold text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student, parent, comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars Only</option>
            <option value="2">2 Stars Only</option>
            <option value="1">1 Star Only</option>
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Roles (Students & Parents)</option>
            <option value="student">Students Only</option>
            <option value="parent">Parents & Guardians Only</option>
          </select>

          {/* Reply filter */}
          <select
            value={replyFilter}
            onChange={(e) => setReplyFilter(e.target.value)}
            className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3"
          >
            <option value="all">All Feedback</option>
            <option value="pending">Awaiting Reply ({stats?.pending_reply_count || 0})</option>
            <option value="replied">Replied ({stats?.replied_count || 0})</option>
          </select>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Fetching institution feedback stream...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-border p-12 text-center space-y-3">
            <MessageSquareHeart className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No Reviews Match Filters</h3>
            <p className="text-xs text-muted-foreground">Try clearing or adjusting your search filters.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((r) => (
              <Card key={r.id} className="rounded-2xl border-border bg-card shadow-xs overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                        {r.reviewer_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-foreground">{r.reviewer_name}</h4>
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
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="font-semibold">{r.program_title || "NEET Intensive Classroom Program"}</span>
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-600 text-xs font-extrabold">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        <span>{r.rating}.0</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReply(r)}
                        className={cn(
                          "font-bold text-xs gap-1.5 cursor-pointer shadow-xs",
                          r.institution_reply ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-white hover:bg-primary/90"
                        )}
                      >
                        <Reply className="h-3.5 w-3.5" />
                        {r.institution_reply ? "Edit Official Reply" : "Reply to Feedback"}
                      </Button>
                    </div>
                  </div>

                  {/* Sub-ratings */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Academics</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.academic_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Faculty</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.faculty_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Infrastructure</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.infrastructure_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
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

                  {/* Official Response Box */}
                  {r.institution_reply && (
                    <div className="mt-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                          <Building className="h-4 w-4 text-primary" />
                          <span>Official Published Response from Leadership</span>
                        </div>
                        {r.institution_replied_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.institution_replied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 italic pl-1 border-l-2 border-primary/40">
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

      {/* REPLY DIALOG */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Reply className="h-5 w-5 text-primary" />
              Publish Official Institution Response
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your reply will be immediately visible to the submitter and displayed publicly under this review.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 pt-2">
              {/* Original Review Snippet */}
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{selectedReview.reviewer_name} ({selectedReview.reviewer_role})</span>
                  <span className="text-amber-500 font-extrabold">{selectedReview.rating}.0 ★</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  &ldquo;{selectedReview.comment}&rdquo;
                </p>
              </div>

              <form onSubmit={handlePublishReply} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Official Institution Response *</Label>
                  <Textarea
                    placeholder="Write a professional and encouraging reply to the student/parent feedback..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-xs min-h-[110px] resize-none"
                    required
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReplyDialogOpen(false)} className="text-xs cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submittingReply} className="text-xs font-bold gap-1.5 cursor-pointer">
                    {submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publish Response
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
