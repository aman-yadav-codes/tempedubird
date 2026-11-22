"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Plus,
  Search,
  Building2,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  X,
  FolderTree,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { ImageUploadInput } from "@/components/shared/image-upload-input";

interface MasterCourse {
  id: number;
  name: string;
  slug: string;
  code?: string | null;
  category_id: number;
  category_name?: string | null;
  authority_type: string;
  university_id?: number | null;
  university_name?: string | null;
  board_id?: number | null;
  certification_provider_id?: number | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  seats_available?: number | null;
  medium?: string | null;
  mediums?: string[];
  description?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
}

export default function MasterCoursesPage() {
  const { accessToken } = useAuthStore();
  const [courses, setCourses] = useState<MasterCourse[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [selectedAuthority, setSelectedAuthority] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal Dialog Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<MasterCourse | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [authorityType, setAuthorityType] = useState<string>("University");
  const [universityName, setUniversityName] = useState("");
  const [durationValue, setDurationValue] = useState<string>("3");
  const [durationUnit, setDurationUnit] = useState<string>("Years");
  const [seatsAvailable, setSeatsAvailable] = useState<string>("60");
  const [medium, setMedium] = useState<string>("English");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Load Categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/public/categories?type=course&limit=250");
      const json = await res.json();
      if (json?.data) {
        setCategories(json.data);
      }
    } catch {
      // silently handle
    }
  }, []);

  // Load Master Courses
  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());
      if (selectedCatId !== "all") params.set("categoryId", selectedCatId);
      if (selectedAuthority !== "all") params.set("authorityType", selectedAuthority);

      const res = await fetch(`/api/admin/catalog/courses?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCourses(json.data);
        setTotal(json.meta?.total || json.data.length);
      } else {
        toast.error(json.error || "Failed to load master courses");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch master courses");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, selectedCatId, selectedAuthority]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const openCreateDialog = () => {
    setEditingCourse(null);
    setName("");
    setSlug("");
    setCode("");
    setCategoryId(categories[0]?.id ? String(categories[0].id) : "");
    setAuthorityType("University");
    setUniversityName("");
    setDurationValue("3");
    setDurationUnit("Years");
    setSeatsAvailable("60");
    setMedium("English");
    setDescription("");
    setThumbnailUrl("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (c: MasterCourse) => {
    setEditingCourse(c);
    setName(c.name || "");
    setSlug(c.slug || "");
    setCode(c.code || "");
    setCategoryId(c.category_id ? String(c.category_id) : "");
    setAuthorityType(c.authority_type || "University");
    setUniversityName(c.university_name || "");
    setDurationValue(c.duration_value !== null && c.duration_value !== undefined ? String(c.duration_value) : "");
    setDurationUnit(c.duration_unit || "Years");
    setSeatsAvailable(c.seats_available !== null && c.seats_available !== undefined ? String(c.seats_available) : "60");
    setMedium(c.medium || "English");
    setDescription(c.description || "");
    setThumbnailUrl(c.thumbnail_url || "");
    setIsActive(c.is_active);
    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCourse) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a course category");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingCourse?.id,
        name: name.trim(),
        slug: slug.trim() || undefined,
        code: code.trim() || null,
        category_id: Number(categoryId),
        authority_type: authorityType,
        university_name: universityName.trim() || null,
        duration_value: durationValue ? Number(durationValue) : null,
        duration_unit: durationUnit,
        seats_available: seatsAvailable ? Number(seatsAvailable) : 60,
        medium,
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        is_active: isActive,
      };

      const res = await fetch("/api/admin/catalog/courses", {
        method: editingCourse ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save course");

      toast.success(editingCourse ? "Master Course updated" : "Master Course created");
      setDialogOpen(false);
      loadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: MasterCourse) => {
    try {
      const res = await fetch("/api/admin/catalog/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Course ${!c.is_active ? "activated" : "deactivated"}`);
      loadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this course from master catalog?")) return;
    try {
      const res = await fetch(`/api/admin/catalog/courses?id=${id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete course");
      toast.success("Master Course removed");
      loadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete course");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-xs">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Master Courses Catalog</span>
              <Badge variant="outline" className="text-xs font-bold border-amber-300 text-amber-700 bg-amber-50">
                {total} Courses
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Define standard academic degrees, competitive coaching courses, certifications, and vocational curricula.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateDialog}
          className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm shrink-0"
        >
          <Plus className="size-4" /> Add Master Course
        </Button>
      </div>

      {/* FILTERS & SEARCH ROW */}
      <Card className="border border-border/60 shadow-xs bg-card">
        <CardContent className="p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search course title, code, university..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <Select
                value={selectedCatId}
                onValueChange={(val) => {
                  setSelectedCatId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Course Categories" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Course Categories ({categories.length})</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Authority Type Filter */}
            <div>
              <Select
                value={selectedAuthority}
                onValueChange={(val) => {
                  setSelectedAuthority(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Authority Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authority Types</SelectItem>
                  <SelectItem value="University">University</SelectItem>
                  <SelectItem value="Board">Board / Council</SelectItem>
                  <SelectItem value="Autonomous Institute">Autonomous Institute</SelectItem>
                  <SelectItem value="Coaching / Training Provider">Coaching / Training Provider</SelectItem>
                  <SelectItem value="Professional Body">Professional Body</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COURSES TABLE */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span>Course Catalog Listings</span>
            <Badge variant="secondary" className="text-[10px]">
              Page {page} of {Math.max(1, Math.ceil(total / 50))}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {courses.length} of {total} listings
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Loading course catalog...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <BookOpen className="size-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No master courses found</p>
              <p className="text-xs">Try adjusting your search criteria or create a new master course.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[70px] text-xs">ID</TableHead>
                    <TableHead className="text-xs min-w-[240px]">Course Details</TableHead>
                    <TableHead className="text-xs">Authority &amp; Affiliation</TableHead>
                    <TableHead className="text-xs">Duration &amp; Seats</TableHead>
                    <TableHead className="text-xs">Medium</TableHead>
                    <TableHead className="text-xs text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/20 text-xs">
                      <TableCell className="font-mono text-muted-foreground">#{c.id}</TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpen className="size-4" />
                          </div>
                          <div className="space-y-1">
                            <a
                              href={`/courses/${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-foreground leading-tight hover:text-primary hover:underline flex items-center gap-1 group"
                            >
                              <span>{c.name}</span>
                              <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </a>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {c.code && <span className="font-mono bg-muted/60 px-1 rounded">{c.code}</span>}
                              <span className="truncate max-w-[150px] text-muted-foreground font-mono">/{c.slug}</span>

                              {c.category_name && (
                                <Badge variant="outline" className="text-[9px] bg-amber-50/50 text-amber-800 border-amber-200 py-0 px-1.5 h-4">
                                  {c.category_name}
                                </Badge>
                              )}

                              {c.is_active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] py-0 px-1.5 h-4 gap-0.5">
                                  <CheckCircle2 className="size-2.5" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[9px] py-0 px-1.5 h-4 gap-0.5">
                                  <XCircle className="size-2.5" /> Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="leading-tight">
                          <span className="font-semibold text-foreground">
                            {c.university_name || "General / Central"}
                          </span>
                          <span className="block text-[10px] text-muted-foreground capitalize">
                            {c.authority_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[11px] text-muted-foreground">
                          {c.duration_value ? (
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Clock className="size-3 text-primary" />
                              {c.duration_value} {c.duration_unit}
                            </span>
                          ) : (
                            <span>Flexible</span>
                          )}
                          <span>{c.seats_available || 60} Seats</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{c.medium || "English"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1 px-2">
                              <span>Actions</span>
                              <ChevronDown className="size-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Course Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/courses/${c.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <ExternalLink className="size-3.5 text-blue-500" />
                                <span>View Public Page</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(c)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Edit2 className="size-3.5 text-primary" />
                              <span>Edit Course</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(c)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              {c.is_active ? (
                                <>
                                  <XCircle className="size-3.5 text-amber-500" />
                                  <span>Deactivate Course</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                  <span>Activate Course</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(c.id)}
                              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                              <span>Delete Course</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* PAGINATION */}
          {total > 50 && (
            <div className="p-3 border-t bg-muted/10 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Showing {(page - 1) * 50 + 1} - {Math.min(page * 50, total)} of {total}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-medium"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 50 >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-medium"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: ADD / EDIT MASTER COURSE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4.5 text-amber-600" />
              <span>{editingCourse ? "Edit Master Course" : "Add Master Course"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Specify academic parameters, course category, authority affiliation, and duration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Course Name */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Course / Program Name *</Label>
                <Input
                  placeholder="e.g. Bachelor of Technology in Computer Science (B.Tech CSE)"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              {/* Course Code */}
              <div>
                <Label className="text-xs font-semibold">Course Code</Label>
                <Input
                  placeholder="e.g. BTECH-CSE-101"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              {/* URL Slug */}
              <div>
                <Label className="text-xs font-semibold">URL Slug</Label>
                <Input
                  placeholder="e.g. btech-computer-science"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              {/* Course Category */}
              <div>
                <Label className="text-xs font-semibold">Course Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select Category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Authority Type */}
              <div>
                <Label className="text-xs font-semibold">Authority / Classification</Label>
                <Select value={authorityType} onValueChange={setAuthorityType}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select Authority Type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="University">University Degree</SelectItem>
                    <SelectItem value="Board">Secondary / Higher Secondary Board</SelectItem>
                    <SelectItem value="Council">Professional Council / Body</SelectItem>
                    <SelectItem value="Autonomous Institute">Autonomous Institute</SelectItem>
                    <SelectItem value="Coaching / Training Provider">Coaching &amp; Test Prep</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* University / Board Name */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">University / Board / Authority Name</Label>
                <Input
                  placeholder="e.g. University of Delhi, CBSE, IIT Council, BFSI SSC"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              {/* Duration Value & Unit */}
              <div>
                <Label className="text-xs font-semibold">Duration Value</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Duration Unit</Label>
                <Select value={durationUnit} onValueChange={setDurationUnit}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                    <SelectItem value="Weeks">Weeks</SelectItem>
                    <SelectItem value="Hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seats Available & Medium */}
              <div>
                <Label className="text-xs font-semibold">Seats Available</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 60"
                  value={seatsAvailable}
                  onChange={(e) => setSeatsAvailable(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Medium of Instruction</Label>
                <Select value={medium} onValueChange={setMedium}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Bilingual">Bilingual (English + Hindi)</SelectItem>
                    <SelectItem value="Regional">Regional Language</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Thumbnail URL */}
              <div className="sm:col-span-2">
                <ImageUploadInput
                  label="Course Thumbnail / Banner Image"
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                  folder="courses"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Course Description &amp; Overview</Label>
                <Textarea
                  placeholder="Outline key learning outcomes, curriculum, eligibility, and program objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 text-xs resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Active in Platform Catalog</span>
                  <p className="text-[11px] text-muted-foreground">
                    When active, institutes can adopt this master course into their campus offerings.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !name.trim()}
                className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editingCourse ? "Update Course" : "Create Master Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
