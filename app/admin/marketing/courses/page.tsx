"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  IndianRupee,
  Clock,
  CheckCircle2,
  Layers,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Users,
  Upload,
  Loader2,
  Eye,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InheritMasterCoursesDialog } from "@/components/admin/catalog/inherit-master-courses-dialog";

export interface CourseRecord {
  id: number;
  institution_id?: number;
  business_profile_id?: number;
  master_course_id?: number;
  course_name: string;
  slug?: string;
  code?: string;
  stream?: string;
  category_id?: number;
  category_name?: string;
  board_or_university?: string;
  duration?: string;
  price?: string;
  fee_amount: number;
  seats_available?: number;
  eligibility?: string;
  description?: string;
  thumbnail_url?: string;
  icon_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

function formatCurrency(val: number | string | null | undefined) {
  const num = Number(val) || 0;
  return num > 0 ? `₹${num.toLocaleString("en-IN")}` : "Free";
}

export default function MarketingCoursesPage() {
  const { accessToken } = useAuthStore();
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    avgFee: 0,
    categoriesCount: 0,
  });

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [inheritModalOpen, setInheritModalOpen] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStream, setFormStream] = useState("");
  const [formBoard, setFormBoard] = useState("");
  const [formDuration, setFormDuration] = useState("1 Year");
  const [formFee, setFormFee] = useState("");
  const [formSeats, setFormSeats] = useState("60");
  const [formDescription, setFormDescription] = useState("");
  const [formThumbnail, setFormThumbnail] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch Courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategoryId !== "all") params.set("category_id", selectedCategoryId);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/admin/marketing/courses?${params.toString()}`, { headers });
      const data = await res.json();

      if (res.ok && Array.isArray(data.courses)) {
        setCourses(data.courses);
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.categories)) setCategories(data.categories);
      } else {
        toast.error(data.error || "Failed to load marketing courses");
      }
    } catch {
      toast.error("Failed to fetch marketing courses");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, selectedCategoryId, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCourses]);

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormName("");
    setFormCode("");
    setFormStream("");
    setFormBoard("");
    setFormDuration("1 Year");
    setFormFee("");
    setFormSeats("60");
    setFormDescription("");
    setFormThumbnail("");
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: CourseRecord) => {
    setEditingCourse(c);
    setFormName(c.course_name || "");
    setFormCode(c.code || "");
    setFormStream(c.stream || c.category_name || "");
    setFormBoard(c.board_or_university || "");
    setFormDuration(c.duration || "1 Year");
    setFormFee(String(c.fee_amount || ""));
    setFormSeats(String(c.seats_available || "60"));
    setFormDescription(c.description || "");
    setFormThumbnail(c.thumbnail_url || "");
    setFormIsActive(c.is_active);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (course: CourseRecord) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const nextStatus = !course.is_active;
      const res = await fetch("/api/admin/marketing/courses", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: course.id, is_active: nextStatus }),
      });
      if (res.ok) {
        setCourses((prev) =>
          prev.map((item) => (item.id === course.id ? { ...item, is_active: nextStatus } : item))
        );
        toast.success(`Course ${nextStatus ? "activated" : "deactivated"}`);
      }
    } catch {
      toast.error("Failed to update course status");
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Are you sure you want to remove this course from your marketing catalog?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/marketing/courses?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Course removed successfully");
        fetchCourses();
      } else {
        toast.error("Failed to remove course");
      }
    } catch {
      toast.error("Error removing course");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setFormThumbnail(json.url);
      toast.success("Thumbnail uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Course name is required");
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const payload = {
        id: editingCourse?.id,
        course_name: formName.trim(),
        code: formCode.trim() || undefined,
        stream: formStream.trim() || undefined,
        board_or_university: formBoard.trim() || undefined,
        duration: formDuration.trim() || undefined,
        fee_amount: Number(formFee) || 0,
        seats_available: Number(formSeats) || 60,
        description: formDescription.trim() || undefined,
        thumbnail_url: formThumbnail.trim() || undefined,
        is_active: formIsActive,
      };

      const res = await fetch("/api/admin/marketing/courses", {
        method: editingCourse ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save course");
      }

      toast.success(editingCourse ? "Course updated successfully!" : "Course added to catalog!");
      setDialogOpen(false);
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Marketing Courses & Programs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage course offerings, configure tuition fees, and inherit standardized programs from the master catalog.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInheritModalOpen(true)}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-primary" />
            Inherit
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold">Total Courses</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold">Active Offerings</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold">Categories / Streams</CardDescription>
            <CardTitle className="text-2xl font-bold text-sky-600">{stats.categoriesCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold">Average Course Fee</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">₹{stats.avgFee.toLocaleString("en-IN")}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by course name, code, university..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {categories.length > 0 && (
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-9 text-xs w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id || cat.name} value={cat.id ? String(cat.id) : cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs font-medium">Loading marketing courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-12 text-center shadow-2xs border-dashed">
          <GraduationCap className="size-12 mx-auto text-muted-foreground/40 mb-2" />
          <h3 className="text-base font-bold text-foreground">No Courses in Catalog</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            You haven&apos;t added any courses to your marketing catalog yet. You can inherit standardized courses from the master catalog or create a custom course.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInheritModalOpen(true)}
              className="gap-1.5 font-bold text-xs"
            >
              <Layers className="size-4" />
              Inherit from Master Catalog
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 font-bold text-xs">
              <Plus className="size-4" />
              Add Custom Course
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={`overflow-hidden transition-all shadow-2xs hover:shadow-xs border ${
                course.is_active ? "bg-card" : "bg-muted/30 opacity-75"
              }`}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                    {course.thumbnail_url || course.icon_url ? (
                      <img
                        src={course.thumbnail_url || course.icon_url || ""}
                        alt={course.course_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="size-6 text-muted-foreground/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground truncate">{course.course_name}</h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                      {course.code && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono font-bold">
                          {course.code}
                        </Badge>
                      )}
                      {course.stream && (
                        <span className="font-medium text-foreground/80">{course.stream}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-sky-500 shrink-0" />
                    <span>{course.duration || "1 Year"}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Users className="size-3 text-emerald-500 shrink-0" />
                    <span>{course.seats_available || 60} Seats</span>
                  </div>

                  {course.board_or_university && (
                    <div className="col-span-2 flex items-center gap-1.5 truncate">
                      <Sparkles className="size-3 text-amber-500 shrink-0" />
                      <span className="truncate">{course.board_or_university}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Course Fee</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(course.fee_amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={course.is_active}
                      onCheckedChange={() => handleToggleStatus(course)}
                      title={course.is_active ? "Active" : "Inactive"}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(course)}
                      title="Edit Course"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCourse(course.id)}
                      title="Delete Course"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* INHERIT MASTER COURSES DIALOG */}
      <InheritMasterCoursesDialog
        open={inheritModalOpen}
        onOpenChange={setInheritModalOpen}
        onSuccess={fetchCourses}
        accessToken={accessToken}
      />

      {/* ADD / EDIT COURSE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              <span>{editingCourse ? "Edit Course" : "Add New Course"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure course details, duration, capacity, and tuition fee for your marketing catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course Name *</Label>
              <Input
                placeholder="e.g. Master of Business Administration (MBA)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Course Code</Label>
                <Input
                  placeholder="e.g. MBA-101"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category / Stream</Label>
                <Input
                  placeholder="e.g. Management, IT, Medical"
                  value={formStream}
                  onChange={(e) => setFormStream(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Board / University</Label>
                <Input
                  placeholder="e.g. Delhi University / Autonomous"
                  value={formBoard}
                  onChange={(e) => setFormBoard(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration</Label>
                <Input
                  placeholder="e.g. 2 Years, 6 Months"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tuition Fee (₹)</Label>
                <div className="relative">
                  <IndianRupee className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 (Free)"
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="h-9 pl-7 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Seats Available</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="60"
                  value={formSeats}
                  onChange={(e) => setFormSeats(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course Description</Label>
              <Textarea
                rows={3}
                placeholder="Course curriculum overview, eligibility criteria, and learning outcomes..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Thumbnail / Cover Image</Label>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                  {formThumbnail ? (
                    <img src={formThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="size-6 text-muted-foreground/50" />
                  )}
                </div>

                <label className="cursor-pointer inline-flex items-center justify-center px-3 h-8 rounded-lg border bg-muted hover:bg-muted/80 text-xs font-semibold gap-1.5 shadow-2xs transition-colors">
                  {uploadingImage ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} id="course-active" />
              <Label htmlFor="course-active" className="text-xs font-medium cursor-pointer">
                Publish course in public catalog & storefront
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="font-bold">
                {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                {editingCourse ? "Save Changes" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
