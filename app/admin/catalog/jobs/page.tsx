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
  Briefcase,
  Plus,
  Search,
  Building2,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  MapPin,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  X,
  FolderTree,
  UserCheck,
  Tag,
  DollarSign,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessCurrency } from "@/hooks/use-business-currency";
import { useAuthStore } from "@/store";

interface MasterJob {
  id: number;
  title: string;
  slug: string;
  business_category_id: number;
  business_category_name?: string | null;
  professional_category_id: number;
  professional_category_name?: string | null;
  role_id?: number | null;
  role_name?: string | null;
  role_title?: string | null;
  department: string;
  employment_type: string;
  experience_level: string;
  work_mode: string;
  location: string;
  salary_range?: string | null;
  openings_count: number;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  skills?: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface BizCategoryOption {
  id: number;
  name: string;
  slug: string;
}

interface ProfCategoryOption {
  id: number;
  name: string;
  slug: string;
  business_category_id?: number | null;
}

interface DesignationOption {
  id: number;
  name: string;
  slug: string;
}

export default function MasterJobsPage() {
  const { accessToken } = useAuthStore();
  const { currencySymbol } = useBusinessCurrency();
  const [jobs, setJobs] = useState<MasterJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown reference data
  const [businessCategories, setBusinessCategories] = useState<BizCategoryOption[]>([]);
  const [allProfCategories, setAllProfCategories] = useState<ProfCategoryOption[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterBizCatId, setFilterBizCatId] = useState<string>("all");
  const [filterProfCatId, setFilterProfCatId] = useState<string>("all");
  const [filterWorkMode, setFilterWorkMode] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal Dialog Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<MasterJob | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State: 4-Step Mandatory Hierarchy
  // Step 1: Business Category
  const [formBizCatId, setFormBizCatId] = useState<string>("");
  // Step 2: Professional Category (Filtered by Business Category)
  const [formProfCatId, setFormProfCatId] = useState<string>("");
  // Step 3: Professional Role / Designation
  const [formRoleId, setFormRoleId] = useState<string>("");
  const [formRoleTitle, setFormRoleTitle] = useState<string>("");
  // Step 4: Job-Related Details
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level (3-5 yrs)");
  const [workMode, setWorkMode] = useState("On-site");
  const [location, setLocation] = useState("All India / Multiple Locations");
  const [salaryRange, setSalaryRange] = useState("");
  const [openingsCount, setOpeningsCount] = useState("1");
  const [skillsText, setSkillsText] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Filtered Professional Categories for the Form based on selected Business Category
  const availableProfCategories = useMemo(() => {
    if (!formBizCatId) return allProfCategories;
    const bizId = Number(formBizCatId);
    const filtered = allProfCategories.filter(
      (pc) => pc.business_category_id === bizId
    );
    return filtered.length > 0 ? filtered : allProfCategories;
  }, [formBizCatId, allProfCategories]);

  // Load Dropdown Options
  const loadDropdownData = useCallback(async () => {
    try {
      const [bizRes, profRes, desigRes] = await Promise.all([
        fetch("/api/public/categories?type=business&onlyRoot=true&limit=150"),
        fetch("/api/public/categories?type=professional&limit=250"),
        fetch("/api/designations?limit=300"),
      ]);

      const [bizData, profData, desigData] = await Promise.all([
        bizRes.json(),
        profRes.json(),
        desigRes.json(),
      ]);

      if (bizData?.data) setBusinessCategories(bizData.data);
      if (profData?.data) setAllProfCategories(profData.data);
      if (desigData?.data) setDesignations(desigData.data);
    } catch (e) {
      console.error("Failed to load job dropdown dependencies:", e);
    }
  }, []);

  // Load Master Jobs Table Data
  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());
      if (filterBizCatId !== "all") params.set("businessCategoryId", filterBizCatId);
      if (filterProfCatId !== "all") params.set("professionalCategoryId", filterProfCatId);

      const res = await fetch(`/api/admin/catalog/jobs?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setJobs(json.data);
        setTotal(json.meta?.total || json.data.length);
      } else {
        toast.error(json.error || "Failed to load master jobs");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch master jobs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, filterBizCatId, filterProfCatId]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const openCreateDialog = () => {
    setEditingJob(null);
    const defaultBiz = businessCategories[0]?.id ? String(businessCategories[0].id) : "";
    setFormBizCatId(defaultBiz);
    setFormProfCatId("");
    setFormRoleId("");
    setFormRoleTitle("");
    setTitle("");
    setSlug("");
    setDepartment("General");
    setEmploymentType("Full-time");
    setExperienceLevel("Mid Level (3-5 yrs)");
    setWorkMode("On-site");
    setLocation("All India / Multiple Locations");
    setSalaryRange("");
    setOpeningsCount("1");
    setSkillsText("");
    setDescription("");
    setRequirements("");
    setBenefits("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (j: MasterJob) => {
    setEditingJob(j);
    setFormBizCatId(j.business_category_id ? String(j.business_category_id) : "");
    setFormProfCatId(j.professional_category_id ? String(j.professional_category_id) : "");
    setFormRoleId(j.role_id ? String(j.role_id) : "");
    setFormRoleTitle(j.role_title || "");
    setTitle(j.title || "");
    setSlug(j.slug || "");
    setDepartment(j.department || "");
    setEmploymentType(j.employment_type || "Full-time");
    setExperienceLevel(j.experience_level || "Mid Level (3-5 yrs)");
    setWorkMode(j.work_mode || "On-site");
    setLocation(j.location || "All India / Multiple Locations");
    setSalaryRange(j.salary_range || "");
    setOpeningsCount(j.openings_count ? String(j.openings_count) : "1");
    setSkillsText(Array.isArray(j.skills) ? j.skills.join(", ") : "");
    setDescription(j.description || "");
    setRequirements(j.requirements || "");
    setBenefits(j.benefits || "");
    setIsActive(j.is_active);
    setDialogOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingJob) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
  };

  const handleRoleSelect = (roleIdVal: string) => {
    setFormRoleId(roleIdVal);
    const selectedDesig = designations.find((d) => String(d.id) === roleIdVal);
    if (selectedDesig) {
      setFormRoleTitle(selectedDesig.name);
      if (!title || title === formRoleTitle) {
        setTitle(selectedDesig.name);
        if (!editingJob) {
          setSlug(
            selectedDesig.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)+/g, "")
          );
        }
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBizCatId) {
      toast.error("Step 1: Please select a Business Category");
      return;
    }
    if (!formProfCatId) {
      toast.error("Step 2: Please select a Professional Category");
      return;
    }
    if (!formRoleId && !formRoleTitle.trim()) {
      toast.error("Step 3: Please select or enter a Professional Role");
      return;
    }
    if (!title.trim()) {
      toast.error("Step 4: Please enter a Job Title");
      return;
    }
    if (!department.trim()) {
      toast.error("Please enter a department");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a job description");
      return;
    }

    setSaving(true);
    try {
      const skillsArray = skillsText
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        id: editingJob?.id,
        business_category_id: Number(formBizCatId),
        professional_category_id: Number(formProfCatId),
        role_id: formRoleId ? Number(formRoleId) : null,
        role_title: formRoleTitle.trim() || undefined,
        title: title.trim(),
        slug: slug.trim() || undefined,
        department: department.trim(),
        employment_type: employmentType,
        experience_level: experienceLevel,
        work_mode: workMode,
        location: location.trim(),
        salary_range: salaryRange.trim() || null,
        openings_count: openingsCount ? Number(openingsCount) : 1,
        skills: skillsArray,
        description: description.trim(),
        requirements: requirements.trim() || null,
        benefits: benefits.trim() || null,
        is_active: isActive,
      };

      const res = await fetch("/api/admin/catalog/jobs", {
        method: editingJob ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save master job");

      toast.success(editingJob ? "Master Job updated" : "Master Job created");
      setDialogOpen(false);
      loadJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (j: MasterJob) => {
    try {
      const res = await fetch("/api/admin/catalog/jobs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: j.id, is_active: !j.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Job ${!j.is_active ? "activated" : "deactivated"}`);
      loadJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this job from master catalog?")) return;
    try {
      const res = await fetch(`/api/admin/catalog/jobs?id=${id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete job");
      toast.success("Master Job removed");
      loadJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-xs">
            <Briefcase className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Master Jobs Catalog</span>
              <Badge variant="outline" className="text-xs font-bold border-blue-300 text-blue-700 bg-blue-50">
                {total} Jobs
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Define standard job openings mapped across Business Categories, Professional Disciplines, and Roles.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateDialog}
          className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm shrink-0"
        >
          <Plus className="size-4" /> Add Master Job
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
                placeholder="Search job title, role, department, skills..."
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

            {/* Business Category Filter */}
            <div>
              <Select
                value={filterBizCatId}
                onValueChange={(val) => {
                  setFilterBizCatId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Business Sectors" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Business Sectors ({businessCategories.length})</SelectItem>
                  {businessCategories.map((bc) => (
                    <SelectItem key={bc.id} value={String(bc.id)}>
                      {bc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Professional Category Filter */}
            <div>
              <Select
                value={filterProfCatId}
                onValueChange={(val) => {
                  setFilterProfCatId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Professional Fields" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Professional Fields ({allProfCategories.length})</SelectItem>
                  {allProfCategories.map((pc) => (
                    <SelectItem key={pc.id} value={String(pc.id)}>
                      {pc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JOBS TABLE */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span>Job Catalog Listings</span>
            <Badge variant="secondary" className="text-[10px]">
              Page {page} of {Math.max(1, Math.ceil(total / 50))}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {jobs.length} of {total} listings
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Loading job catalog...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <Briefcase className="size-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No master jobs found</p>
              <p className="text-xs">Create standard job openings to allow companies and institutions to recruit.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[70px] text-xs">ID</TableHead>
                    <TableHead className="text-xs min-w-[220px]">Job Title &amp; Role</TableHead>
                    <TableHead className="text-xs">Classification</TableHead>
                    <TableHead className="text-xs">Department &amp; Mode</TableHead>
                    <TableHead className="text-xs">Experience &amp; Compensation</TableHead>
                    <TableHead className="text-xs">Openings &amp; Location</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id} className="hover:bg-muted/20 text-xs">
                      <TableCell className="font-mono text-muted-foreground">#{j.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Briefcase className="size-4" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground leading-tight">{j.title}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              {j.role_name && <span className="font-semibold text-primary">{j.role_name}</span>}
                              <span className="truncate max-w-[150px]">({j.employment_type})</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {j.business_category_name && (
                            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-800 border-rose-200 block truncate max-w-[180px]">
                              {j.business_category_name}
                            </Badge>
                          )}
                          {j.professional_category_name && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-800 border-purple-200 block truncate max-w-[180px]">
                              {j.professional_category_name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="leading-tight">
                          <span className="font-semibold text-foreground">{j.department}</span>
                          <span className="block text-[11px] text-muted-foreground capitalize">
                            {j.work_mode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{j.experience_level}</span>
                          {j.salary_range ? (
                            <span className="font-bold text-emerald-600">{j.salary_range}</span>
                          ) : (
                            <span>Competitive</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <Users className="size-3 text-primary" />
                            {j.openings_count || 1} Openings
                          </span>
                          <span className="truncate max-w-[130px] flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {j.location}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(j)}
                          className="cursor-pointer"
                          title="Click to toggle status"
                        >
                          {j.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditDialog(j)}
                            title="Edit Job"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => handleDelete(j.id)}
                            title="Delete Job"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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

      {/* MODAL: ADD / EDIT MASTER JOB (4-STEP MANDATORY HIERARCHY) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="size-4.5 text-blue-600" />
              <span>{editingJob ? "Edit Master Job" : "Add Master Job to Catalog"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow the required 4-step hierarchy: Business Category &rarr; Professional Category &rarr; Professional Role &rarr; Job Details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 1: BUSINESS CATEGORY */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 dark:bg-rose-950/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-[#d9232e] text-white flex items-center justify-center text-[10px] font-black">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Business Category (Industry Sector) *
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Select the macro industry sector that this job vacancy belongs to.
                  </p>
                </div>
              </div>

              <Select
                value={formBizCatId}
                onValueChange={(val) => {
                  setFormBizCatId(val);
                  setFormProfCatId(""); // Reset professional category on business change
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select Business Category..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {businessCategories.map((bc) => (
                    <SelectItem key={bc.id} value={String(bc.id)}>
                      {bc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 2: PROFESSIONAL CATEGORY (FILTERED BY BUSINESS CATEGORY) */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Professional Category (Field / Discipline) *
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Select the specialized professional classification associated with this sector.
                  </p>
                </div>
              </div>

              <Select value={formProfCatId} onValueChange={setFormProfCatId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select Professional Category..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableProfCategories.map((pc) => (
                    <SelectItem key={pc.id} value={String(pc.id)}>
                      {pc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 3: PROFESSIONAL ROLE / DESIGNATION */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Professional Role / Designation *
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Select from master designations or specify the professional role.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Select Master Designation</Label>
                  <Select value={formRoleId} onValueChange={handleRoleSelect}>
                    <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose Designation ({designations.length})..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {designations.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">Role Title / Custom Designation</Label>
                  <Input
                    placeholder="e.g. Senior IIT-JEE Physics Faculty"
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    className="mt-1 h-9 text-xs bg-background"
                  />
                </div>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 4: JOB RELATED DETAILS */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                  4
                </div>
                <h4 className="text-xs font-bold text-foreground">Job Details &amp; Specifications</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Job Title */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Job Title *</Label>
                  <Input
                    placeholder="e.g. Senior IIT-JEE Physics Master Coach"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <Input
                    placeholder="e.g. senior-physics-master-coach"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>

                {/* Department */}
                <div>
                  <Label className="text-xs font-semibold">Department *</Label>
                  <Input
                    placeholder="e.g. Academics & Science, Engineering, Operations"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <Label className="text-xs font-semibold">Employment Type</Label>
                  <Select value={employmentType} onValueChange={setEmploymentType}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Freelance">Freelance / Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Work Mode */}
                <div>
                  <Label className="text-xs font-semibold">Work Mode</Label>
                  <Select value={workMode} onValueChange={setWorkMode}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On-site">On-site</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience Level */}
                <div>
                  <Label className="text-xs font-semibold">Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fresher / Entry Level (0-1 yrs)">Fresher / Entry Level (0-1 yrs)</SelectItem>
                      <SelectItem value="Junior (1-3 yrs)">Junior (1-3 yrs)</SelectItem>
                      <SelectItem value="Mid Level (3-5 yrs)">Mid Level (3-5 yrs)</SelectItem>
                      <SelectItem value="Senior Level (5-8 yrs)">Senior Level (5-8 yrs)</SelectItem>
                      <SelectItem value="Lead / Director (8+ yrs)">Lead / Director (8+ yrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Salary Range */}
                <div>
                  <Label className="text-xs font-semibold">Salary / Compensation Range</Label>
                  <Input
                    placeholder={`e.g. ${currencySymbol}12,00,000 - ${currencySymbol}20,00,000 P.A.`}
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                {/* Openings Count & Location */}
                <div>
                  <Label className="text-xs font-semibold">Openings Count</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={openingsCount}
                    onChange={(e) => setOpeningsCount(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Location</Label>
                  <Input
                    placeholder="e.g. Kota, Rajasthan / Multiple Locations"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                {/* Skills */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Key Skills &amp; Competencies</Label>
                  <Input
                    placeholder="e.g. IIT-JEE Physics, NEET Mentorship, Mechanics, Electrodynamics (comma-separated)"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Job Description *</Label>
                  <Textarea
                    placeholder="Detailed responsibilities, team structure, day-to-day duties, and impact..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 text-xs resize-none"
                    required
                  />
                </div>

                {/* Requirements */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Requirements &amp; Qualifications</Label>
                  <Textarea
                    placeholder="Educational background, minimum experience, certifications, and technical skills required..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={2}
                    className="mt-1 text-xs resize-none"
                  />
                </div>

                {/* Benefits */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Benefits &amp; Perks</Label>
                  <Textarea
                    placeholder="Health insurance, annual bonuses, flexible timings, travel allowance, housing..."
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    rows={2}
                    className="mt-1 text-xs resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Active in Platform Catalog</span>
                    <p className="text-[11px] text-muted-foreground">
                      When active, registered institutions and businesses can adopt or clone this master job opening.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !title.trim() || !formBizCatId || !formProfCatId}
                className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editingJob ? "Update Master Job" : "Create Master Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
