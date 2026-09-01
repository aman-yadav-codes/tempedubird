"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  MessageSquare,
  Loader2,
  Send,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  UserCheck,
  MessageCircle,
  Building2,
  BookOpen,
  CheckSquare,
  BookMarked,
  User,
  Lock,
  LogIn,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";

export type UniversalEntityTarget = {
  type:
    | "institution"
    | "course"
    | "program"
    | "practice"
    | "teacher"
    | "faculty"
    | "notes"
    | "placement"
    | "facility"
    | "blog"
    | "article"
    | "exam"
    | "vendor"
    | "product";
  id: number;
  title: string;
  subtitle?: string;
  avg_rating?: number;
  review_count?: number;
};

type ReviewItem = {
  id: number;
  reviewer_name: string;
  reviewer_role: string;
  is_verified_user: boolean;
  rating: number;
  title?: string;
  comment: string;
  created_at: string;
};

type ReviewStats = {
  overall_avg: number;
  total_reviews: number;
  verified_avg: number;
  verified_count: number;
  community_avg: number;
  community_count: number;
};

export function UniversalFeedbackDialog({
  target,
  open,
  onOpenChange,
}: {
  target: UniversalEntityTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuthStore();

  const [stats, setStats] = useState<ReviewStats>({
    overall_avg: target?.avg_rating || 4.8,
    total_reviews: target?.review_count || 4,
    verified_avg: 4.9,
    verified_count: 2,
    community_avg: 4.6,
    community_count: 2,
  });
  const [allReviews, setAllReviews] = useState<ReviewItem[]>([]);
  const [verifiedReviews, setVerifiedReviews] = useState<ReviewItem[]>([]);
  const [communityReviews, setCommunityReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerRole, setReviewerRole] = useState("Enrolled Student");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target?.id && open) {
      void fetchEntityReviews(target.type, target.id);
    }
  }, [target?.id, target?.type, open]);

  const fetchEntityReviews = async (type: string, id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/reviews?entityType=${type}&entityId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setAllReviews(json.allReviews || []);
        setVerifiedReviews(json.verifiedReviews || []);
        setCommunityReviews(json.communityReviews || []);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch entity reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target?.id) return;

    if (!user) {
      toast.error("Please sign in to submit a rating and review.");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter your review comments or feedback");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: target.type,
          entity_id: target.id,
          reviewer_role: reviewerRole,
          rating,
          comment: comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit review");

      toast.success("Thank you! Your verified rating and comment have been published.");
      setComment("");
      void fetchEntityReviews(target.type, target.id);
    } catch (err: any) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!target) return null;

  const entityTypeLabels: Record<string, { label: string; icon: any }> = {
    institution: { label: "Institution & College", icon: Building2 },
    course: { label: "Course & Program", icon: BookOpen },
    program: { label: "Academic Program", icon: BookOpen },
    practice: { label: "Practice & Mock Test", icon: CheckSquare },
    teacher: { label: "Teacher & Faculty", icon: UserCheck },
    faculty: { label: "Faculty Member", icon: UserCheck },
    notes: { label: "Study Notes & Material", icon: BookMarked },
    placement: { label: "Placement Statistics", icon: Award },
    facility: { label: "Campus Facility", icon: Building2 },
    blog: { label: "Campus Article & Journal", icon: FileText },
    article: { label: "Educational Guide", icon: FileText },
  };

  const currentTypeInfo = entityTypeLabels[target.type] || {
    label: "Listing Feedback",
    icon: Sparkles,
  };
  const TypeIcon = currentTypeInfo.icon;

  const redirectUrl =
    typeof window !== "undefined"
      ? `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      : "/login";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* HEADER */}
        <DialogHeader className="p-5 pb-3.5 border-b bg-muted/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="outline" className="mb-1 text-xs bg-primary/10 text-primary border-primary/20 capitalize font-bold gap-1">
                <TypeIcon className="h-3 w-3" />
                {currentTypeInfo.label}
              </Badge>
              <DialogTitle className="text-lg sm:text-xl font-black text-foreground leading-tight">
                {target.title}
              </DialogTitle>
              {target.subtitle && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {target.subtitle}
                </DialogDescription>
              )}
            </div>

            <div className="flex flex-col items-end shrink-0 bg-card border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-amber-500 font-black text-lg">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{stats.overall_avg > 0 ? stats.overall_avg.toFixed(1) : "4.8"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">
                ({stats.total_reviews} Ratings)
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* DIALOG BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* USER LOGIN GATEWAY FOR SUBMITTING REVIEWS */}
          {!user ? (
            <div className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center space-y-3.5 shadow-2xs">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Sign In Required to Rate & Comment
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  To ensure authentic and trusted community feedback, ratings and comments are reserved for logged-in members.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                size="sm"
                className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 shadow-xs cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Write a Review
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                  <span>Rate, Review & Leave a Comment</span>
                </h4>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 font-bold">
                  <ShieldCheck className="h-3 w-3" />
                  Verified User
                </Badge>
              </div>

              {/* LOGGED IN USER PROFILE ROW */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/15 text-primary font-black text-xs flex items-center justify-center shrink-0">
                    {(user.full_name || user.email || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-foreground truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="w-40 shrink-0">
                  <select
                    id="rev-role"
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    className="w-full h-7 rounded-lg border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Enrolled Student">Enrolled Student</option>
                    <option value="Parent / Guardian">Parent / Guardian</option>
                    <option value="Teacher / Faculty">Teacher / Faculty</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>

              {/* STAR SELECTION */}
              <div className="space-y-1 bg-muted/30 p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Your Rating:</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-1.5 text-xs font-bold text-foreground">
                    {hoverRating || rating} / 5 Stars
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rev-comment" className="text-xs font-bold text-foreground">Your Detailed Comment / Review *</Label>
                <Textarea
                  id="rev-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your authentic learning experience, exam insights, practical lab feedback..."
                  rows={2}
                  className="text-xs rounded-lg"
                  required
                />
              </div>

              <Button type="submit" size="sm" disabled={submitting} className="w-full font-bold text-xs gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Publish Rating & Comment
              </Button>
            </form>
          )}

          {/* REVIEWS STREAM & TABS */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full flex items-center justify-start gap-1 p-1 bg-muted/60 rounded-xl border border-border min-h-10">
              <TabsTrigger value="all" className="flex-1 text-xs font-bold gap-1 py-1.5 cursor-pointer">
                <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
                <span>All Reviews ({allReviews.length})</span>
              </TabsTrigger>

              <TabsTrigger value="verified" className="flex-1 text-xs font-bold gap-1 py-1.5 cursor-pointer">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>Verified ({verifiedReviews.length})</span>
              </TabsTrigger>

              <TabsTrigger value="community" className="flex-1 text-xs font-bold gap-1 py-1.5 cursor-pointer">
                <MessageCircle className="h-3 w-3 text-primary" />
                <span>Comments & Q&A ({communityReviews.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* 1. ALL REVIEWS TAB */}
            <TabsContent value="all" className="mt-3 space-y-2.5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading reviews...
                </div>
              ) : allReviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                  <Sparkles className="mx-auto h-7 w-7 text-amber-400/60 mb-2" />
                  Be the first to rate and comment on this listing!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {allReviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge variant="outline" className={`text-[10px] gap-1 font-semibold ${r.is_verified_user ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                            {r.is_verified_user && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {r.reviewer_role || "Student"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.rating}.0</span>
                        </div>
                      </div>

                      {r.title && <h5 className="font-bold text-foreground text-xs">{r.title}</h5>}
                      {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}

                      <span className="text-[10px] text-muted-foreground/80 block pt-0.5">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 2. VERIFIED REVIEWS TAB */}
            <TabsContent value="verified" className="mt-3 space-y-2.5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading verified reviews...
                </div>
              ) : verifiedReviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                  No verified student reviews recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {verifiedReviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge className="text-[10px] gap-1 font-semibold bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {r.reviewer_role || "Enrolled Student"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.rating}.0</span>
                        </div>
                      </div>

                      {r.title && <h5 className="font-bold text-foreground text-xs">{r.title}</h5>}
                      {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}

                      <span className="text-[10px] text-muted-foreground/80 block pt-0.5">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3. COMMUNITY COMMENTS TAB */}
            <TabsContent value="community" className="mt-3 space-y-2.5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading comments...
                </div>
              ) : communityReviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                  No public comments recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {communityReviews.map((r) => (
                    <div key={r.id} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-muted text-muted-foreground">
                            {r.reviewer_role || "Member"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{Number(r.rating).toFixed(1)}</span>
                        </div>
                      </div>

                      {r.title && <h5 className="font-bold text-foreground text-xs">{r.title}</h5>}
                      {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}

                      <span className="text-[10px] text-muted-foreground/80 block pt-0.5">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="signin"
      />
    </Dialog>
  );
}
