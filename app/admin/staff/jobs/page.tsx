"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StaffJobApplication, StaffJobPosting } from "@/lib/queries/jobs";

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Visiting Faculty",
  "Ad-hoc / Guest",
];

const WORK_MODES = ["On-site", "Remote", "Hybrid"];

const EXPERIENCE_LEVELS = [
  "Fresher (0-1 yrs)",
  "1-3 Years",
  "3-5 Years",
  "5-8 Years",
  "8+ Years",
  "Senior / HOD / Principal",
];

const DEPARTMENTS = [
  "Academic & Teaching",
  "Computer Science & IT",
  "Mathematics & Science",
  "Humanities & Arts",
  "Commerce & Business",
  "Administration & HR",
  "Admissions & Counselling",
  "Finance & Accounts",
  "Sports & Physical Ed",
  "Hostel & Campus Facilities",
  "Transport & Logistics",
  "Library & Resource Center",
];

type JobFormData = {
  id?: number;
  institution_id: string;
  title: string;
  department: string;
  employment_type: string;
  experience_level: string;
  work_mode: string;
  location: string;
  salary_range: string;
  openings_count: number;
  deadline: string;
  description: string;
  requirements: string;
  benefits: string;
  status: "Active" | "Draft" | "Closed" | "Archived";
};

const initialFormData: JobFormData = {
  institution_id: "",
  title: "",
  department: "Academic & Teaching",
  employment_type: "Full-time",
  experience_level: "1-3 Years",
  work_mode: "On-site",
  location: "Main Campus",
  salary_range: "Best in Industry",
  openings_count: 1,
  deadline: "",
  description: "",
  requirements: "",
  benefits: "",
  status: "Active",
};

export default function AdminStaffJobsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") || user?.is_super_admin
  );

  const [jobs, setJobs] = useState<StaffJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [empTypeFilter, setEmpTypeFilter] = useState("all");
  const [selectedInstFilter, setSelectedInstFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<JobFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const { saveStatus: jobSaveStatus, clearDraft: clearJobDraft } = useProgressiveSave({
    formKey: `staff_job:${form.id || "new"}`,
    formState: form,
    enabled: dialogOpen,
  });

  const [deleteTarget, setDeleteTarget] = useState<StaffJobPosting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [applicantsSheetOpen, setApplicantsSheetOpen] = useState(false);
  const [selectedJobForApps, setSelectedJobForApps] = useState<StaffJobPosting | null>(null);
  const [applications, setApplications] = useState<StaffJobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const [institutions, setInstitutions] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!isPlatformAdmin || !accessToken) return;
    fetch(`/api/admin/institutions/profiles?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setInstitutions(
          (json.data || []).map((i: any) => ({
            id: i.id,
            name: i.organization_name || i.name || `Institution ${i.id}`,
          }))
        );
      })
      .catch(() => undefined);
  }, [accessToken, isPlatformAdmin]);

  const loadJobs = useCallback(async () => {
    if (!isReady || !accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        department: deptFilter,
        employmentType: empTypeFilter,
      });

      if (!isPlatformAdmin && activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      } else if (selectedInstFilter !== "all") {
        params.set("institutionId", selectedInstFilter);
      }

      const res = await fetch(`/api/admin/staff/jobs?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jobs");

      setJobs(json.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeInstitution,
    authHeader,
    deptFilter,
    empTypeFilter,
    isPlatformAdmin,
    isReady,
    search,
    selectedInstFilter,
    statusFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadJobs();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadJobs]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === "Active").length;
    const drafts = jobs.filter((j) => j.status === "Draft").length;
    const applicants = jobs.reduce((acc, curr) => acc + (curr.applications_count || 0), 0);
    return { total, active, drafts, applicants };
  }, [jobs]);

  function openCreateDialog() {
    setForm({
      ...initialFormData,
      institution_id: activeInstitution ? String(activeInstitution.id) : "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(job: StaffJobPosting) {
    setForm({
      id: job.id,
      institution_id: job.institution_id ? String(job.institution_id) : "",
      title: job.title,
      department: job.department,
      employment_type: job.employment_type || "Full-time",
      experience_level: job.experience_level || "1-3 Years",
      work_mode: job.work_mode || "On-site",
      location: job.location || "Campus",
      salary_range: job.salary_range || "Best in Industry",
      openings_count: job.openings_count || 1,
      deadline: job.deadline ? job.deadline.split("T")[0] : "",
      description: job.description || "",
      requirements: job.requirements || "",
      benefits: job.benefits || "",
      status: job.status || "Active",
    });
    setDialogOpen(true);
  }

  async function handleSaveJob() {
    if (!form.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!form.department.trim()) {
      toast.error("Department is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Job description is required");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(form.id);
      const url = "/api/admin/staff/jobs";
      const method = isEdit ? "PATCH" : "POST";

      const payload = {
        ...(isEdit ? { id: form.id } : {}),
        institution_id: form.institution_id ? Number(form.institution_id) : (activeInstitution ? activeInstitution.id : null),
        title: form.title.trim(),
        department: form.department,
        employment_type: form.employment_type,
        experience_level: form.experience_level,
        work_mode: form.work_mode,
        location: form.location.trim(),
        salary_range: form.salary_range.trim(),
        openings_count: Number(form.openings_count) || 1,
        deadline: form.deadline || null,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        benefits: form.benefits.trim(),
        status: form.status,
      };

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save job");

      toast.success(isEdit ? "Job opening updated!" : "New job opening published!");
      setDialogOpen(false);
      await loadJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteJob() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/staff/jobs?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete job");

      toast.success("Job posting removed successfully");
      setDeleteTarget(null);
      await loadJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setDeleting(false);
    }
  }

  async function openApplicantsSheet(job: StaffJobPosting) {
    setSelectedJobForApps(job);
    setApplicantsSheetOpen(true);
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/admin/staff/jobs/${job.id}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load applications");
      setApplications(json.data.applications || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoadingApps(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <Briefcase className="size-4" />
            Recruitment & Careers
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Our Jobs & Vacancies
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Create, publish, and manage faculty vacancies, staff job openings, and recruitment drives. Published active jobs appear on the public website footer & careers portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadJobs()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={openCreateDialog}
            className="h-9 gap-1.5 font-bold text-xs shadow-xs"
          >
            <Plus className="size-4" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Postings</span>
            <Briefcase className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Across all departments</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Openings</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Accepting public applications</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Draft Postings</span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.drafts}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Unpublished jobs</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Applicants</span>
            <Users className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.applicants}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Candidate applications received</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title, department, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPlatformAdmin && (
            <Select value={selectedInstFilter} onValueChange={setSelectedInstFilter}>
              <SelectTrigger className="h-9 text-xs w-[180px]">
                <SelectValue placeholder="All Institutions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutions</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={String(inst.id)}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={empTypeFilter} onValueChange={setEmpTypeFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EMPLOYMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs Grid / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Loading job vacancies...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Briefcase className="size-6" />
          </div>
          <h3 className="font-bold text-sm">No Job Openings Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by posting your campus recruitment vacancy. It will appear on the public careers portal and footer.
          </p>
          <Button onClick={openCreateDialog} size="sm" className="gap-1 text-xs font-bold">
            <Plus className="size-3.5" /> Post Job Vacancy
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const isActive = job.status === "Active";
            const isDraft = job.status === "Draft";

            return (
              <Card
                key={job.id}
                className="flex flex-col justify-between border transition-all duration-200 hover:shadow-md bg-card"
              >
                <CardHeader className="p-4 pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={isActive ? "default" : isDraft ? "outline" : "secondary"}
                        className={
                          isActive
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[10px]"
                            : isDraft
                            ? "border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {job.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {job.employment_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {job.work_mode}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-xs">Job Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(job)} className="gap-2 text-xs">
                          <Edit2 className="size-3.5" /> Edit Job
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void openApplicantsSheet(job)} className="gap-2 text-xs">
                          <Users className="size-3.5" /> View Applicants ({job.applications_count || 0})
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 text-xs">
                          <Link href="/jobs" target="_blank">
                            <ExternalLink className="size-3.5" /> Preview on Careers Page
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(job)}
                          className="gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="size-3.5" /> Delete Job
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                      {job.title}
                    </CardTitle>
                    <p className="text-xs text-primary font-semibold mt-0.5">{job.department}</p>
                    {job.institution_name && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="size-3" />
                        {job.institution_name}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{job.location || "Campus"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{job.experience_level || "1-3 Yrs"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{job.salary_range || "Negotiable"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{job.openings_count} Opening{job.openings_count > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openApplicantsSheet(job)}
                      className="h-7 text-xs font-semibold gap-1.5"
                    >
                      <Users className="size-3" />
                      Applicants ({job.applications_count || 0})
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(job)}
                      className="h-7 text-xs text-primary hover:text-primary"
                    >
                      <Edit2 className="size-3 mr-1" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              {form.id ? "Edit Job Opening" : "Post New Job Opening"}
            </DialogTitle>
            <DialogDescription>
              Provide vacancy details. Active jobs will be published to the campus career portal and website footer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="job-title">Job Title *</Label>
              <Input
                id="job-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Assistant Professor (Computer Science), Academic Counselor..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Department / Functional Area *</Label>
              <Select
                value={form.department}
                onValueChange={(val) => setForm({ ...form, department: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select
                value={form.employment_type}
                onValueChange={(val) => setForm({ ...form, employment_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Work Mode</Label>
              <Select
                value={form.work_mode}
                onValueChange={(val) => setForm({ ...form, work_mode: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Experience Level</Label>
              <Select
                value={form.experience_level}
                onValueChange={(val) => setForm({ ...form, experience_level: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((exp) => (
                    <SelectItem key={exp} value={exp}>
                      {exp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-location">Location / Campus</Label>
              <Input
                id="job-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Main Campus, Varanasi / Remote"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-salary">Salary / Compensation</Label>
              <Input
                id="job-salary"
                value={form.salary_range}
                onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                placeholder="e.g. ₹40,000 - ₹60,000 / month or ₹8 - ₹12 LPA"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-openings">Number of Openings</Label>
              <Input
                id="job-openings"
                type="number"
                min="1"
                value={form.openings_count}
                onChange={(e) => setForm({ ...form, openings_count: Math.max(1, Number(e.target.value)) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-deadline">Application Deadline</Label>
              <Input
                id="job-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Publishing Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (Published to Website)</SelectItem>
                  <SelectItem value="Draft">Draft (Hidden from Public)</SelectItem>
                  <SelectItem value="Closed">Closed (No longer accepting)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isPlatformAdmin && (
              <div className="space-y-1.5">
                <Label>Campus / Institution</Label>
                <Select
                  value={form.institution_id || "platform"}
                  onValueChange={(val) =>
                    setForm({ ...form, institution_id: val === "platform" ? "" : val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Platform-wide (EduBird HQ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform-wide (EduBird HQ)</SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="job-description">Job Description & Responsibilities *</Label>
              <Textarea
                id="job-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe role responsibilities, key tasks, classroom duties, or administrative expectations..."
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="job-requirements">Eligibility & Qualifications</Label>
              <Textarea
                id="job-requirements"
                rows={3}
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Required degrees (e.g. M.Tech, Ph.D, B.Ed), skills, certifications, and background..."
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="job-benefits">Benefits & Perks</Label>
              <Textarea
                id="job-benefits"
                rows={2}
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                placeholder="e.g. Health Insurance, Provident Fund, Faculty Housing, Research Grants, Free Transport..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <ProgressiveSaveIndicator status={jobSaveStatus} />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  clearJobDraft();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveJob();
                  clearJobDraft();
                }}
                disabled={saving}
                className="font-bold"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                {form.id ? "Update Job" : "Publish Job"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Vacancy?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? All associated applications will also be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteJob();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Applicants Sheet */}
      <Sheet open={applicantsSheetOpen} onOpenChange={setApplicantsSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Candidate Applications
            </SheetTitle>
            <SheetDescription>
              Candidates who submitted applications for &quot;{selectedJobForApps?.title}&quot;.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {loadingApps ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="size-6 animate-spin text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                <Users className="size-8 mx-auto text-muted-foreground opacity-50" />
                <h4 className="font-semibold text-sm">No Applications Yet</h4>
                <p className="text-xs text-muted-foreground">
                  Applications submitted from the public careers page will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <Card key={app.id} className="p-4 border bg-card space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{app.applicant_name}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="size-3 text-primary" />
                            <a href={`mailto:${app.applicant_email}`} className="hover:underline">{app.applicant_email}</a>
                          </span>
                          {app.applicant_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3 text-primary" />
                              <a href={`tel:${app.applicant_phone}`} className="hover:underline">{app.applicant_phone}</a>
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {app.status}
                      </Badge>
                    </div>

                    {(app.experience_years || app.current_organization) && (
                      <div className="text-xs text-muted-foreground flex gap-4 pt-1 border-t">
                        {app.experience_years && <span>Experience: <strong>{app.experience_years}</strong></span>}
                        {app.current_organization && <span>Current Org: <strong>{app.current_organization}</strong></span>}
                      </div>
                    )}

                    {app.cover_letter && (
                      <p className="text-xs text-muted-foreground/90 bg-muted/40 p-2.5 rounded-md italic">
                        &quot;{app.cover_letter}&quot;
                      </p>
                    )}

                    {app.resume_url && (
                      <div className="pt-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-semibold gap-1.5"
                        >
                          <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="size-3.5 text-primary" />
                            View Resume / Portfolio
                          </a>
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
