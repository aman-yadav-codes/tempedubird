"use client";

import React, { useEffect, useState } from "react";
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

export type UniversalEntityTarget = {
  type: "faculty" | "program" | "placement" | "facility";
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
  const [stats, setStats] = useState<ReviewStats>({
    overall_avg: target?.avg_rating || 4.9,
    total_reviews: target?.review_count || 3,
    verified_avg: 4.9,
    verified_count: 2,
    community_avg: 4.5,
    community_count: 1,
  });
  const [verifiedReviews, setVerifiedReviews] = useState<ReviewItem[]>([]);
  const [communityReviews, setCommunityReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("Enrolled Student");
  const [isVerifiedOption, setIsVerifiedOption] = useState(true);
  const [reviewTitle, setReviewTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target?.id && open) {
      fetchEntityReviews(target.type, target.id);
    }
  }, [target?.id, target?.type, open]);

  const fetchEntityReviews = async (type: string, id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/reviews?entityType=${type}&entityId=${id}`);
      if (res.ok) {
        const json = await res.json();
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
    if (!reviewerName.trim()) {
      toast.error("Please enter your name");
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
          reviewer_name: reviewerName.trim(),
          reviewer_role: reviewerRole,
          is_verified: isVerifiedOption,
          rating,
          title: reviewTitle.trim(),
          comment: comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit review");

      toast.success("Thank you! Your feedback has been published.");
      setReviewTitle("");
      setComment("");
      void fetchEntityReviews(target.type, target.id);
    } catch (err: any) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!target) return null;

  const entityTypeLabels: Record<string, string> = {
    faculty: "Faculty Member",
    program: "Academic Program",
    placement: "Placement Statistics",
    facility: "Campus Facility",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Badge variant="outline" className="mb-1 text-xs bg-primary/10 text-primary border-primary/20 capitalize font-semibold">
                {entityTypeLabels[target.type] || target.type} Feedback
              </Badge>
              <DialogTitle className="text-xl font-bold text-foreground">{target.title}</DialogTitle>
              {target.subtitle && (
                <DialogDescription className="text-xs mt-0.5">{target.subtitle}</DialogDescription>
              )}
            </div>

            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xl">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span>{stats.overall_avg > 0 ? stats.overall_avg.toFixed(1) : "4.9"}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                ({stats.total_reviews} Total Ratings)
              </span>
            </div>
          </div>

          {/* RATING BREAKDOWN STATS */}
          <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-bold">
                  {stats.verified_avg > 0 ? stats.verified_avg.toFixed(1) : "4.9"} ★ Verified
                </div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                  {stats.verified_count} Enrolled Student & Parent Reviews
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
              <Users className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-bold">
                  {stats.community_avg > 0 ? stats.community_avg.toFixed(1) : "4.5"} ★ Community
                </div>
                <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                  {stats.community_count} General Guest Ratings
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* DIALOG BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SUBMIT FEEDBACK FORM */}
          <form onSubmit={handleSubmitReview} className="rounded-xl border bg-card p-4 space-y-4 shadow-xs">
            <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                Write Rating & Review
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">Share your experience</span>
            </h4>

            {/* STAR SELECTION */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Star Rating</Label>
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
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          active ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-bold text-muted-foreground">
                  {hoverRating || rating} / 5 Stars
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rev-name" className="text-xs">Your Name *</Label>
                <Input
                  id="rev-name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rev-role" className="text-xs">Your Role / Status</Label>
                <select
                  id="rev-role"
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Enrolled Student">Enrolled Student</option>
                  <option value="Parent / Guardian">Parent / Guardian</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Faculty">Faculty / Staff</option>
                  <option value="Community Member">Community Guest</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="is-verified-chk"
                checked={isVerifiedOption}
                onChange={(e) => setIsVerifiedOption(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="is-verified-chk" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Submit as Verified Student / Parent Review
              </Label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rev-title" className="text-xs">Review Title (Optional)</Label>
              <Input
                id="rev-title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g. Excellent academic faculty and practical exposure"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="rev-comment" className="text-xs">Your Detailed Feedback Comments</Label>
              <Textarea
                id="rev-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your detailed feedback on course quality, teaching standards, placement support, or infrastructure..."
                rows={3}
                className="text-xs"
              />
            </div>

            <Button type="submit" size="sm" disabled={submitting} className="w-full font-bold text-xs gap-1.5 shadow-xs">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish Review & Rating
            </Button>
          </form>

          {/* TWO SECTIONS: VERIFIED FEEDBACK VS COMMUNITY RATINGS */}
          <Tabs defaultValue="verified" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="verified" className="text-xs font-bold gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Genuine Verified Feedback ({verifiedReviews.length})</span>
              </TabsTrigger>

              <TabsTrigger value="community" className="text-xs font-bold gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Community Ratings ({communityReviews.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* 1. VERIFIED REVIEWS TAB */}
            <TabsContent value="verified" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading verified reviews...
                </div>
              ) : verifiedReviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-card">
                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500/40 mb-2" />
                  No verified student or parent reviews submitted yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {verifiedReviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            {r.reviewer_role || "Verified Student"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.rating}.0</span>
                        </div>
                      </div>

                      {r.title && <h5 className="font-bold text-foreground text-xs">{r.title}</h5>}
                      {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}

                      <span className="text-[10px] text-muted-foreground/70 block pt-0.5">
                        Verified Review • {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 2. COMMUNITY REVIEWS TAB */}
            <TabsContent value="community" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading community reviews...
                </div>
              ) : communityReviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-card">
                  <Users className="mx-auto h-8 w-8 text-blue-500/40 mb-2" />
                  No community guest ratings submitted yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {communityReviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl border bg-card space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{r.reviewer_name}</span>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {r.reviewer_role || "Community User"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{r.rating}.0</span>
                        </div>
                      </div>

                      {r.title && <h5 className="font-bold text-foreground text-xs">{r.title}</h5>}
                      {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}

                      <span className="text-[10px] text-muted-foreground/70 block pt-0.5">
                        Community Rating • {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
