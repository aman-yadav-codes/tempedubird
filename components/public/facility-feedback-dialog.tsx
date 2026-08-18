"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Loader2, Send, ThumbsUp, UserCheck, CheckCircle2 } from "lucide-react";
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

export type FacilityTarget = {
  id: number;
  title: string;
  facility_type_name?: string;
  description?: string;
  avg_rating?: number;
  review_count?: number;
};

type FacilityReview = {
  id: number;
  reviewer_name: string;
  reviewer_role: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function FacilityFeedbackDialog({
  facility,
  open,
  onOpenChange,
}: {
  facility: FacilityTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reviews, setReviews] = useState<FacilityReview[]>([]);
  const [stats, setStats] = useState<{ avg_rating: number; total_reviews: number }>({
    avg_rating: facility?.avg_rating || 4.8,
    total_reviews: facility?.review_count || 3,
  });
  const [loading, setLoading] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("Student");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (facility?.id && open) {
      fetchReviews(facility.id);
    }
  }, [facility?.id, open]);

  const fetchReviews = async (facId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/facilities/reviews?facilityId=${facId}`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.reviews || []);
        if (json.stats?.total_reviews > 0) {
          setStats({
            avg_rating: Number(json.stats.avg_rating),
            total_reviews: Number(json.stats.total_reviews),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch facility reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility?.id) return;
    if (!reviewerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/facilities/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facility.id,
          reviewer_name: reviewerName.trim(),
          reviewer_role: reviewerRole,
          rating,
          comment: comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit review");

      toast.success("Thank you! Your rating and feedback have been published.");
      setComment("");
      void fetchReviews(facility.id);
    } catch (err: any) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!facility) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Badge variant="outline" className="mb-1 text-xs bg-primary/10 text-primary border-primary/20">
                {facility.facility_type_name || "Campus Infrastructure"}
              </Badge>
              <DialogTitle className="text-xl font-bold">{facility.title}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Rate quality, cleanliness, maintenance & leave your feedback.
              </DialogDescription>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-amber-500 font-extrabold text-lg">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span>{stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : "4.8"}</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                ({stats.total_reviews} {stats.total_reviews === 1 ? "Rating" : "Ratings"})
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* RATE & REVIEW FORM */}
          <form onSubmit={handleSubmitReview} className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Give Rating & Write Feedback
            </h4>

            {/* STAR SELECTION */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Overall Quality Rating</Label>
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
                <Label htmlFor="reviewer-name" className="text-xs">Your Name *</Label>
                <Input
                  id="reviewer-name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="reviewer-role" className="text-xs">Your Role</Label>
                <select
                  id="reviewer-role"
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Student">Current Student</option>
                  <option value="Parent">Parent / Guardian</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Faculty">Faculty / Staff</option>
                  <option value="Visitor">Campus Visitor</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-comment" className="text-xs">Your Feedback & Review Comments</Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe cleanliness, modern equipment, availability, maintenance..."
                rows={3}
                className="text-xs"
              />
            </div>

            <Button type="submit" size="sm" disabled={submitting} className="w-full font-bold text-xs gap-1.5 shadow-xs">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Rating & Review
            </Button>
          </form>

          {/* REVIEWS LIST */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
              <span>Student & Visitor Reviews</span>
              <Badge variant="secondary" className="text-[11px] font-semibold">{reviews.length} Feedbacks</Badge>
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" /> Loading feedback...
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 border rounded-lg bg-card">
                No reviews submitted yet. Be the first to rate this facility!
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {reviews.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl border bg-card space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{r.reviewer_name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 font-normal">
                          {r.reviewer_role}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{r.rating}.0</span>
                      </div>
                    </div>

                    {r.comment && (
                      <p className="text-muted-foreground leading-relaxed pt-1">{r.comment}</p>
                    )}

                    <span className="text-[10px] text-muted-foreground/70 block pt-0.5">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
