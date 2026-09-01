"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  MessageSquareHeart,
  Building,
  Users,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Loader2,
  RefreshCw,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export default function ParentReviewsPage() {
  const { user, accessToken } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [academicRating, setAcademicRating] = useState(5);
  const [facultyRating, setFacultyRating] = useState(5);
  const [infraRating, setInfraRating] = useState(5);
  const [supportRating, setSupportRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/reviews?scope=mine", { headers });
      const json = await res.json();
      if (res.ok) {
        setReviews(json.reviews || []);
      } else {
        toast.error(json.error || "Failed to load reviews");
      }
    } catch {
      toast.error("Network error loading parent reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please write your feedback message.");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({
          institution_id: 1, // Maa Sharda Institute
          program_id: 1,
          rating,
          academic_rating: academicRating,
          faculty_rating: facultyRating,
          infrastructure_rating: infraRating,
          support_rating: supportRating,
          title: title.trim() || "Parent Guardian Feedback",
          comment: comment.trim(),
          reviewer_role: "Verified Parent / Guardian",
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Thank you! Your parent feedback has been recorded.");
        setDialogOpen(false);
        setTitle("");
        setComment("");
        fetchReviews();
      } else {
        toast.error(json.error || "Failed to submit feedback");
      }
    } catch {
      toast.error("Error submitting parent review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this feedback?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        toast.success("Feedback deleted successfully");
        fetchReviews();
      }
    } catch {
      toast.error("Error deleting feedback");
    }
  };

  const repliedCount = reviews.filter((r) => r.institution_reply).length;
  const avgGiven =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 md:p-8 text-white shadow-xl border border-indigo-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
              <HeartHandshake className="h-3.5 w-3.5" />
              <span>Parent-Institution Collaboration Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Parent Reviews & Feedback</h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
              Share your insights regarding your child&apos;s academic discipline, teacher engagement, and safety. View official replies and feedback status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setDialogOpen(true)}
              size="lg"
              className="font-bold text-xs gap-2 bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer border border-white/20"
            >
              <Plus className="h-4 w-4" />
              Submit Parent Feedback
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchReviews}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
              title="Refresh Feedback"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-black text-foreground">{reviews.length}</h3>
              <p className="text-[11px] text-muted-foreground">Feedback entries logged</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Star className="h-6 w-6 fill-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Rating</p>
              <h3 className="text-2xl font-black text-foreground">{avgGiven} ★</h3>
              <p className="text-[11px] text-muted-foreground">Satisfaction index</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leadership Replies</p>
              <h3 className="text-2xl font-black text-foreground">{repliedCount}</h3>
              <p className="text-[11px] text-muted-foreground">Direct institution responses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REVIEWS FEED */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Feedback & Reviews History
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            Showing {reviews.length} {reviews.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading parent feedback records...</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-border p-12 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto">
              <MessageSquareHeart className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-foreground">No Parent Reviews Yet</h3>
              <p className="text-xs text-muted-foreground">
                You haven&apos;t submitted a parent review yet. Share feedback regarding your child&apos;s learning environment, administration responsiveness, and academic progress.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="font-bold text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Share Parent Feedback
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <Card key={r.id} className="rounded-2xl border-border bg-card shadow-xs overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                        {r.institution_name?.charAt(0) || "M"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-foreground">{r.institution_name}</h4>
                          <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 bg-indigo-500/5">
                            {r.program_title || "NEET Intensive Classroom Program"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-indigo-600">
                            <ShieldCheck className="h-3 w-3" /> {r.reviewer_role}
                          </span>
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
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(r.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete Feedback"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Academic Discipline</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.academic_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Faculty Care</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.faculty_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Campus Safety</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.infrastructure_rating || r.rating}.0
                      </p>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground">Communication</p>
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {r.support_rating || r.rating}.0
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {r.title && <h5 className="text-sm font-bold text-foreground">{r.title}</h5>}
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                  </div>

                  {r.institution_reply ? (
                    <div className="mt-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-extrabold text-foreground">Official Reply from {r.institution_name}</span>
                        </div>
                        {r.institution_replied_at && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(r.institution_replied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed italic pl-1 border-l-2 border-indigo-500/40">
                        &ldquo;{r.institution_reply}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Awaiting leadership reply from {r.institution_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SUBMIT FEEDBACK DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-indigo-600" />
              Submit Parent Review & Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide feedback for Maa Sharda Institute PVT LTD regarding your child&apos;s education.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-foreground">Maa Sharda Institute PVT LTD</span>
              </div>
              <Badge className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                Verified Parent
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Overall Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs font-extrabold text-foreground ml-2">{rating} of 5 Stars</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Academic Discipline</Label>
                <select
                  value={academicRating}
                  onChange={(e) => setAcademicRating(Number(e.target.value))}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Good)</option>
                  <option value={2}>⭐⭐ (2 - Fair)</option>
                  <option value={1}>⭐ (1 - Needs Improvement)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Faculty Support</Label>
                <select
                  value={facultyRating}
                  onChange={(e) => setFacultyRating(Number(e.target.value))}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Good)</option>
                  <option value={2}>⭐⭐ (2 - Fair)</option>
                  <option value={1}>⭐ (1 - Needs Improvement)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Campus Safety & Facilities</Label>
                <select
                  value={infraRating}
                  onChange={(e) => setInfraRating(Number(e.target.value))}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Good)</option>
                  <option value={2}>⭐⭐ (2 - Fair)</option>
                  <option value={1}>⭐ (1 - Needs Improvement)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Communication & Reporting</Label>
                <select
                  value={supportRating}
                  onChange={(e) => setSupportRating(Number(e.target.value))}
                  className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Outstanding)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Good)</option>
                  <option value={2}>⭐⭐ (2 - Fair)</option>
                  <option value={1}>⭐ (1 - Needs Improvement)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Headline</Label>
              <Input
                placeholder="e.g., Transparent attendance updates and supportive teachers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Detailed Parent Feedback *</Label>
              <Textarea
                placeholder="Share your thoughts on attendance tracking, monthly test reports, faculty accessibility, transport, etc..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs min-h-[90px] resize-none"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="text-xs font-bold gap-1.5 cursor-pointer">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Submit Parent Feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
