"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  GraduationCap,
  Clock,
  IndianRupee,
  Building2,
  Layers,
  Search,
  CheckCircle2,
  Loader2,
  Sparkles,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InstitutionCourse } from "@/lib/types/institution";

interface InstitutionCourseManagerProps {
  institutionId?: number;
  accessToken?: string;
  readOnly?: boolean;
  stagedCourses?: InstitutionCourse[];
  onStagedCoursesChange?: (courses: InstitutionCourse[]) => void;
}

const COMMON_STREAMS = [
  "Science",
  "Commerce",
  "Arts / Humanities",
  "Engineering & Technology",
  "Medical & Healthcare",
  "Management & Business",
  "Computer Applications & IT",
  "Law",
  "Design & Media",
  "Vocational / Skill Development",
];

const COMMON_BOARDS_UNIVERSITIES = [
  "CBSE",
  "ICSE / ISC",
  "State Board",
  "Delhi University",
  "Autonomous Institute",
  "State Technical University",
  "Central University",
  "UGC Recognized",
  "AICTE Approved",
];

const DURATION_PRESETS = [
  "3 Months",
  "6 Months",
  "1 Year",
  "2 Years",
  "3 Years",
  "4 Years",
  "5 Years",
];

export function InstitutionCourseManager({
  institutionId,
  accessToken,
  readOnly = false,
  stagedCourses,
  onStagedCoursesChange,
}: InstitutionCourseManagerProps) {
  const [courses, setCourses] = useState<InstitutionCourse[]>(stagedCourses || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync stagedCourses if provided from parent when institutionId is empty
  useEffect(() => {
    if (!institutionId && stagedCourses) {
      setCourses(stagedCourses);
    }
  }, [institutionId, stagedCourses]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<InstitutionCourse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [courseName, setCourseName] = useState("");
  const [stream, setStream] = useState("");
  const [boardOrUniversity, setBoardOrUniversity] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [description, setDescription] = useState("");

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<InstitutionCourse | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!institutionId || institutionId <= 0) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(
        `/api/admin/institutions/courses?institutionId=${institutionId}`,
        { headers }
      );
      const json = await res.json();
      if (res.ok) {
        setCourses(json.data || []);
      } else {
        toast.error(json.error ?? "Failed to load courses");
      }
    } catch {
      toast.error("Network error fetching courses");
    } finally {
      setLoading(false);
    }
  }, [institutionId, accessToken]);

  useEffect(() => {
    if (institutionId && institutionId > 0) {
      void fetchCourses();
    }
  }, [fetchCourses, institutionId]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseName("");
    setStream("");
    setBoardOrUniversity("");
    setDuration("");
    setPrice("");
    setEligibility("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEditModal = (course: InstitutionCourse) => {
    setEditingCourse(course);
    setCourseName(course.course_name || "");
    setStream(course.stream || "");
    setBoardOrUniversity(course.board_or_university || "");
    setDuration(course.duration || "");
    setPrice(course.price || "");
    setEligibility(course.eligibility || "");
    setDescription(course.description || "");
    setDialogOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      toast.error("Course name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (institutionId && institutionId > 0) {
        // Direct Database API mode
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        if (editingCourse) {
          const res = await fetch(`/api/admin/institutions/courses`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              id: editingCourse.id,
              institutionId,
              courseName: courseName.trim(),
              stream: stream.trim() || null,
              boardOrUniversity: boardOrUniversity.trim() || null,
              duration: duration.trim() || null,
              price: price.trim() || null,
              eligibility: eligibility.trim() || null,
              description: description.trim() || null,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            toast.success("Course updated successfully");
            setDialogOpen(false);
            void fetchCourses();
          } else {
            toast.error(json.error ?? "Failed to update course");
          }
        } else {
          const res = await fetch(`/api/admin/institutions/courses`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              institutionId,
              courseName: courseName.trim(),
              stream: stream.trim() || null,
              boardOrUniversity: boardOrUniversity.trim() || null,
              duration: duration.trim() || null,
              price: price.trim() || null,
              eligibility: eligibility.trim() || null,
              description: description.trim() || null,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            toast.success("Course added successfully");
            setDialogOpen(false);
            void fetchCourses();
          } else {
            toast.error(json.error ?? "Failed to add course");
          }
        }
      } else {
        // Staged in-memory mode (for new institution creation)
        if (editingCourse) {
          const updated = courses.map((c) =>
            c.id === editingCourse.id
              ? {
                  ...c,
                  course_name: courseName.trim(),
                  stream: stream.trim() || null,
                  board_or_university: boardOrUniversity.trim() || null,
                  duration: duration.trim() || null,
                  price: price.trim() || null,
                  eligibility: eligibility.trim() || null,
                  description: description.trim() || null,
                  updated_at: new Date().toISOString(),
                }
              : c
          );
          setCourses(updated);
          onStagedCoursesChange?.(updated);
          toast.success("Course updated");
        } else {
          const newCourse: InstitutionCourse = {
            id: Date.now(),
            institution_id: 0,
            course_name: courseName.trim(),
            stream: stream.trim() || null,
            board_or_university: boardOrUniversity.trim() || null,
            duration: duration.trim() || null,
            price: price.trim() || null,
            eligibility: eligibility.trim() || null,
            description: description.trim() || null,
            sort_order: courses.length,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updated = [...courses, newCourse];
          setCourses(updated);
          onStagedCoursesChange?.(updated);
          toast.success("Course added to list");
        }
        setDialogOpen(false);
      }
    } catch {
      toast.error("Network error while saving course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (institutionId && institutionId > 0) {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const res = await fetch(
          `/api/admin/institutions/courses?id=${deleteTarget.id}`,
          {
            method: "DELETE",
            headers,
          }
        );
        if (res.ok) {
          toast.success("Course deleted successfully");
          setDeleteTarget(null);
          void fetchCourses();
        } else {
          const json = await res.json();
          toast.error(json.error ?? "Failed to delete course");
        }
      } catch {
        toast.error("Network error deleting course");
      }
    } else {
      const updated = courses.filter((c) => c.id !== deleteTarget.id);
      setCourses(updated);
      onStagedCoursesChange?.(updated);
      setDeleteTarget(null);
      toast.success("Course removed");
    }
  };

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.course_name.toLowerCase().includes(q) ||
        (c.stream && c.stream.toLowerCase().includes(q)) ||
        (c.board_or_university && c.board_or_university.toLowerCase().includes(q)) ||
        (c.duration && c.duration.toLowerCase().includes(q)) ||
        (c.price && c.price.toLowerCase().includes(q))
    );
  }, [courses, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 border rounded-xl backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Offered Courses & Programs
            </h3>
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
              {courses.length} {courses.length === 1 ? "Course" : "Courses"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Add all courses, streams, board/university affiliations, durations, and fee details offered by this institution.
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            onClick={openCreateModal}
            size="sm"
            className="shrink-0 gap-1.5 font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="size-4" />
            Add Course
          </Button>
        )}
      </div>

      {/* Search Bar when courses exist */}
      {courses.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search courses by name, stream, board/university, duration or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 text-sm h-9"
          />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mr-2" />
          <span>Loading courses...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-card/50">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            {searchQuery ? "No courses match your search" : "No courses added yet"}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {searchQuery
              ? "Try modifying your search term or clearing the filter."
              : "Institutions can list multiple courses with stream, board/university, duration, and pricing."}
          </p>
          {!readOnly && !searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Add First Course
            </Button>
          )}
        </div>
      ) : (
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCourses.map((course, idx) => (
            <div
              key={course.id || idx}
              className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card/80 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all space-y-3"
            >
              {/* Top Row: Course Name & Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm text-foreground truncate" title={course.course_name}>
                      {course.course_name}
                    </h4>
                  </div>
                  {course.stream && (
                    <div className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Layers className="size-3.5 shrink-0" />
                      <span className="truncate">{course.stream}</span>
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditModal(course)}
                      title="Edit Course"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(course)}
                      title="Delete Course"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Badges / Specs Row */}
              <div className="flex flex-wrap gap-2 text-xs">
                {course.board_or_university && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/80 text-secondary-foreground border font-medium">
                    <Building2 className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{course.board_or_university}</span>
                  </div>
                )}

                {course.duration && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    <Clock className="size-3 shrink-0" />
                    <span>{course.duration}</span>
                  </div>
                )}

                {course.price && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    <IndianRupee className="size-3 shrink-0" />
                    <span>{course.price}</span>
                  </div>
                )}
              </div>

              {/* Optional Eligibility or Description */}
              {(course.eligibility || course.description) && (
                <div className="pt-2 border-t text-xs text-muted-foreground line-clamp-2">
                  {course.eligibility && (
                    <p>
                      <span className="font-medium text-foreground">Eligibility:</span> {course.eligibility}
                    </p>
                  )}
                  {course.description && !course.eligibility && (
                    <p>{course.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border border-border/80 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              {editingCourse ? "Edit Course" : "Add Course"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide the course title, academic stream, board or university affiliation, duration and pricing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-4">
            {/* Course Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Course Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. B.Tech Computer Science / Class 12 Science / MBA"
                required
                className="bg-background/60"
              />
            </div>

            {/* Stream & Board / University in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Stream */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stream / Field</Label>
                <Input
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  placeholder="e.g. Science / Engineering / Commerce"
                  className="bg-background/60 text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_STREAMS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStream(s)}
                      className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {s.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Board / University */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Board or University</Label>
                <Input
                  value={boardOrUniversity}
                  onChange={(e) => setBoardOrUniversity(e.target.value)}
                  placeholder="e.g. CBSE / Delhi University / Autonomous"
                  className="bg-background/60 text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_BOARDS_UNIVERSITIES.slice(0, 4).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBoardOrUniversity(b)}
                      className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {b.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration & Price in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration</Label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3 Years / 2 Years / 6 Months"
                  className="bg-background/60 text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className="text-[11px] px-1.5 py-0.5 rounded border bg-muted/30 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-muted-foreground"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price / Fee */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price / Total Fee</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. ₹50,000 / year or ₹1,20,000 total"
                  className="bg-background/60 text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {["₹25,000/yr", "₹50,000/yr", "₹1,00,000", "Free"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrice(p)}
                      className="text-[11px] px-1.5 py-0.5 rounded border bg-muted/30 hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-muted-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Eligibility (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Eligibility / Prerequisites <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="e.g. 10+2 with minimum 50% marks in PCM / Any Graduate"
                className="bg-background/60 text-xs"
              />
            </div>

            {/* Description / Highlights (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Course Highlights / Details <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of curriculum, career prospects, specializations, or certifications included..."
                rows={2}
                className="bg-background/60 text-xs resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingCourse ? (
                  "Update Course"
                ) : (
                  "Add Course"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Delete Course?
            </AlertDialogTitle>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to remove &quot;{deleteTarget?.course_name}&quot;? This action cannot be undone.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
