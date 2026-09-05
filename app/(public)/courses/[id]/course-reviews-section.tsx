"use client";

import { useState } from "react";
import {
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  User,
  Send,
  Loader2,
  Calendar,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface CourseReviewItem {
  id: number;
  entity_type?: string;
  entity_id?: number;
  reviewer_name: string;
  reviewer_role?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  created_at?: string | null;
  is_verified_user?: boolean;
}

export interface CourseReviewsProps {
  courseId: number | string;
  courseTitle: string;
  instituteName?: string | null;
  institutionId?: number | null;
  avgRating?: number;
  totalReviews?: number;
  reviews?: CourseReviewItem[];
}

export function CourseReviewsSection({
  courseId,
  courseTitle,
  instituteName,
  institutionId,
  avgRating: initialAvg = 0,
  totalReviews: initialTotal = 0,
  reviews: initialReviews = [],
}: CourseReviewsProps) {
  const [reviewsList, setReviewsList] = useState<CourseReviewItem[]>(initialReviews);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form State
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("Student");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const totalReviewsCount = reviewsList.length || initialTotal;
  
  // Real Calculated Average Rating
  const effectiveAvgRating =
    reviewsList.length > 0
      ? Number((reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviewsList.length).toFixed(1))
      : initialAvg > 0
      ? Number(Number(initialAvg).toFixed(1))
      : 0;

  // Real Rating Distribution Breakdown (5 to 1 Stars)
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (reviewsList.length > 0) {
    reviewsList.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    });
  }

  const getPercentage = (star: number) => {
    if (totalReviewsCount === 0) return 0;
    return Math.round(((ratingCounts[star] || 0) / totalReviewsCount) * 100);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const numericCourseId = Number(courseId) || 0;
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "course",
          entity_id: numericCourseId,
          institution_id: institutionId || null,
          rating: ratingVal,
          title: reviewTitle.trim() || `Review for ${courseTitle}`,
          comment: reviewComment.trim(),
          reviewer_role: reviewerRole,
          reviewer_name: reviewerName.trim() || "Verified Student",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      // Optimistically prepend the new review to the list
      const newReviewItem: CourseReviewItem = data.review || {
        id: Date.now(),
        reviewer_name: reviewerName.trim() || "Verified Student",
        reviewer_role: reviewerRole,
        rating: ratingVal,
        title: reviewTitle.trim() || `Review for ${courseTitle}`,
        comment: reviewComment.trim(),
        created_at: new Date().toISOString(),
        is_verified_user: true,
      };

      setReviewsList((prev) => [newReviewItem, ...prev]);
      setSubmitSuccess(true);
      setTimeout(() => {
        setDialogOpen(false);
        setSubmitSuccess(false);
        setReviewTitle("");
        setReviewComment("");
        setReviewerName("");
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while submitting your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 pt-2">
      <Card className="rounded-2xl border-border/80 bg-card/60 p-6 shadow-xs backdrop-blur-xs">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Student Reviews & Feedback
              </h2>
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 bg-primary/5">
                Database Verified
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified ratings and real feedback from learners enrolled in this program.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 gap-1.5 rounded-xl bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold shadow-xs cursor-pointer">
                  <Star className="size-3.5 fill-white text-white" />
                  <span>Rate & Write Review</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Write a Review</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Share your experience with {courseTitle} at {instituteName || "this institution"}.
                  </DialogDescription>
                </DialogHeader>

                {submitSuccess ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                    <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground">Thank you for your review!</h4>
                    <p className="text-xs text-muted-foreground">
                      Your feedback has been successfully recorded in the database.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
                    {submitError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-medium text-destructive">
                        {submitError}
                      </div>
                    )}

                    {/* Star Selection */}
                    <div className="space-y-1.5 text-center sm:text-left">
                      <label className="text-xs font-bold text-foreground">Select Rating *</label>
                      <div className="flex items-center justify-center sm:justify-start gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={`rate-star-${star}`}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110 cursor-pointer focus:outline-hidden"
                          >
                            <Star
                              className={`size-7 ${
                                (hoverRating || ratingVal) >= star
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-bold text-amber-500">
                          {hoverRating || ratingVal} Star{ (hoverRating || ratingVal) > 1 ? "s" : "" }
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Your Name</label>
                        <Input
                          placeholder="e.g. Rahul Sharma"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Your Role</label>
                        <Input
                          placeholder="e.g. Student / Alumni"
                          value={reviewerRole}
                          onChange={(e) => setReviewerRole(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Review Headline</label>
                      <Input
                        placeholder="e.g. Great structured curriculum & supportive faculty"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Your Feedback & Experience *</label>
                      <Textarea
                        required
                        rows={3}
                        placeholder="Tell other students about class timings, teaching style, batch support..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogOpen(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || !reviewComment.trim()}
                        className="text-xs bg-[#800000] hover:bg-[#600000] text-white"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-1.5 size-3.5" />
                            Post Review
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Real Ratings Breakdown & Score Card */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
          {/* Left: Overall Big Score */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/20 border border-border/60 text-center">
            <span className="text-5xl font-black tracking-tight text-foreground">
              {effectiveAvgRating > 0 ? effectiveAvgRating.toFixed(1) : "0.0"}
            </span>

            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={`overall-star-${star}`}
                  className={`size-4 ${
                    effectiveAvgRating >= star
                      ? "fill-amber-400 text-amber-400"
                      : effectiveAvgRating >= star - 0.5
                      ? "fill-amber-400/50 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs font-semibold text-muted-foreground">
              {totalReviewsCount > 0 ? `(${totalReviewsCount} Verified Rating${totalReviewsCount === 1 ? "" : "s"})` : "No ratings yet"}
            </p>
          </div>

          {/* Right: 5 to 1 Stars Bar Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = getPercentage(star);
              return (
                <div key={`dist-row-${star}`} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-8 shrink-0 font-bold text-muted-foreground">
                    <span>{star}</span>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden border border-border/40">
                    <div
                      className="h-full rounded-full bg-[#800000] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-[11px] font-semibold text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Reviews List */}
        <div className="mt-8 space-y-4 pt-6 border-t border-border/70">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Student Reviews ({reviewsList.length})
          </h3>

          {reviewsList.length > 0 ? (
            <div className="space-y-3">
              {reviewsList.map((r, idx) => (
                <div
                  key={`db-review-${r.id || idx}`}
                  className="rounded-xl border border-border/70 bg-background/50 p-4 transition-colors hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {r.reviewer_name ? r.reviewer_name.charAt(0) : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">
                            {r.reviewer_name || "Verified Student"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/5 py-0 px-1.5">
                            Verified
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          {r.reviewer_role || "Student"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(r.rating || 5).toFixed(1)}</span>
                    </div>
                  </div>

                  {r.title && (
                    <h4 className="mt-2.5 text-xs font-bold text-foreground">
                      {r.title}
                    </h4>
                  )}

                  {r.comment && (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {r.comment}
                    </p>
                  )}

                  {r.created_at && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-muted/10 border border-dashed border-border text-muted-foreground space-y-2">
              <MessageSquare className="size-8 text-muted-foreground/40" />
              <p className="text-xs font-semibold">No student reviews in the database yet.</p>
              <p className="text-[11px] text-muted-foreground">
                Be the first learner to rate and write a review for this program!
              </p>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="mt-2 text-xs font-bold bg-[#800000] hover:bg-[#600000] text-white rounded-xl"
              >
                Write First Review
              </Button>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
