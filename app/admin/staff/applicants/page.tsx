"use client";

import { useEffect, useState, useCallback, useId } from "react";
import Link from "next/link";
import {
  UserCheck,
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Trash2,
  Eye,
  FileText,
  MessageSquare,
  Award,
  MoreVertical,
  XCircle,
  TrendingUp,
  User,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import type { StaffJobApplication } from "@/lib/queries/jobs";

type Stats = {
  totalApplicants: number;
  pendingCount: number;
  shortlistedCount: number;
  interviewingCount: number;
  hiredCount: number;
  rejectedCount: number;
};

type InstitutionOption = {
  id: number;
  name: string;
};

export default function StaffApplicantsPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);

  const [applicants, setApplicants] = useState<StaffJobApplication[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalApplicants: 0,
    pendingCount: 0,
    shortlistedCount: 0,
    interviewingCount: 0,
    hiredCount: 0,
    rejectedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInstId, setSelectedInstId] = useState<string>("all");
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);

  // Dialogs
  const [selectedApplicant, setSelectedApplicant] = useState<StaffJobApplication | null>(null);
  const [statusModalApplicant, setStatusModalApplicant] = useState<StaffJobApplication | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editNotes, setEditNotes] = useState("");

  const searchInputId = useId();

  // Load institutions list for platform admin
  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetch("/api/admin/institutions?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInstitutions(data.data);
        }
      })
      .catch(() => {});
  }, [isPlatformAdmin]);

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (isPlatformAdmin && selectedInstId !== "all") params.set("institutionId", selectedInstId);

      const res = await fetch(`/api/admin/staff/applicants?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setApplicants(data.data || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load applicants");
      }
    } catch {
      toast.error("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedInstId, isPlatformAdmin]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  const handleOpenStatusModal = (app: StaffJobApplication) => {
    setStatusModalApplicant(app);
    setEditStatus(app.status);
    setEditNotes(app.notes || "");
  };

  const handleUpdateStatus = async () => {
    if (!statusModalApplicant) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/admin/staff/applicants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: statusModalApplicant.id,
          status: editStatus,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Candidate status updated to ${editStatus}`);
        setStatusModalApplicant(null);
        if (selectedApplicant?.id === statusModalApplicant.id) {
          setSelectedApplicant(data.data);
        }
        loadApplicants();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteApplicant = async (id: number) => {
    if (!confirm("Are you sure you want to delete this applicant record?")) return;
    try {
      const res = await fetch(`/api/admin/staff/applicants?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Application deleted");
        if (selectedApplicant?.id === id) setSelectedApplicant(null);
        loadApplicants();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Error deleting application");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="text-[10px] font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">In Review</Badge>;
      case "Shortlisted":
        return <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">Shortlisted</Badge>;
      case "Interviewing":
        return <Badge variant="outline" className="text-[10px] font-bold border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">Interviewing</Badge>;
      case "Hired":
        return <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Hired</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="text-[10px] font-bold border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <UserCheck className="size-4" />
            <span>Recruitment & Hiring</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Staff Applicants
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Review incoming candidate applications submitted from online job postings, manage screening, and track hiring progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadApplicants}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-bold">
            <Link href="/admin/staff/jobs">
              <Briefcase className="size-3.5 text-primary" />
              Manage Jobs
            </Link>
          </Button>

          <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-bold">
            <Link href="/jobs" target="_blank">
              <ExternalLink className="size-3.5" />
              View Careers Portal
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Total Applicants</span>
              <UserCheck className="size-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-foreground">
              {stats.totalApplicants}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Candidate profiles received</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">In Review</span>
              <Clock className="size-4 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-black text-blue-600">
              {stats.pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Awaiting profile evaluation</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Shortlisted</span>
              <Sparkles className="size-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-black text-amber-600">
              {stats.shortlistedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Passed initial screening</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Interview Stage</span>
              <TrendingUp className="size-4 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-black text-purple-600">
              {stats.interviewingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Under active interview rounds</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Hired / Selected</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-black text-emerald-600">
              {stats.hiredCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Successfully onboarded</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/80 bg-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id={searchInputId}
                placeholder="Search candidates by name, email, phone, job title, campus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Institution Filter (Platform Admin only) */}
              {isPlatformAdmin && institutions.length > 0 && (
                <Select value={selectedInstId} onValueChange={setSelectedInstId}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <Building2 className="size-3.5 mr-1.5 text-muted-foreground" />
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

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">In Review</SelectItem>
                  <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="Interviewing">Interviewing</SelectItem>
                  <SelectItem value="Hired">Hired</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applicants List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Loading applicant submissions...</p>
        </div>
      ) : applicants.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <UserCheck className="size-6" />
          </div>
          <h3 className="font-bold text-sm">No Job Applicants Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            No candidate applications match your filter criteria. Publish active jobs to attract top educators and professionals.
          </p>
          <Button asChild size="sm" className="gap-1.5 text-xs font-bold">
            <Link href="/admin/staff/jobs">
              <Briefcase className="size-3.5" />
              View Job Openings
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-bold text-muted-foreground">
                  <th className="p-3.5 pl-4">Candidate</th>
                  <th className="p-3.5">Position Applied</th>
                  <th className="p-3.5">Campus / Institution</th>
                  <th className="p-3.5">Experience</th>
                  <th className="p-3.5">Resume / CV</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Applied Date</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-foreground">{app.applicant_name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{app.applicant_email}</span>
                        {app.applicant_phone && <span>· {app.applicant_phone}</span>}
                      </div>
                      {app.current_organization && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Org: {app.current_organization}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{app.job_title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {app.job_department} {app.job_employment_type ? `· ${app.job_employment_type}` : ""}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-muted/30">
                        <Building2 className="size-3 mr-1 text-muted-foreground" />
                        {app.institution_name || "Campus"}
                      </Badge>
                    </td>

                    <td className="p-3.5">
                      <span className="font-medium text-foreground">
                        {app.experience_years || "Not specified"}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {app.resume_url ? (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                        >
                          <FileText className="size-3.5" />
                          View CV
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">None attached</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {getStatusBadge(app.status)}
                      {app.notes && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5 italic">
                          Note: {app.notes}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(app.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApplicant(app)}
                          className="h-7 text-xs font-bold px-2 gap-1"
                        >
                          <Eye className="size-3.5 text-primary" />
                          Review
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuLabel>Candidate Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedApplicant(app)} className="gap-2">
                              <Eye className="size-3.5" /> View Profile & Cover Letter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenStatusModal(app)} className="gap-2">
                              <UserCheck className="size-3.5" /> Change Candidate Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteApplicant(app.id)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5" /> Delete Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW CANDIDATE MODAL */}
      <Dialog open={Boolean(selectedApplicant)} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <DialogContent className="max-w-xl">
          {selectedApplicant && (
            <div className="space-y-4">
              <DialogHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-black text-foreground">
                      {selectedApplicant.applicant_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      Applied for <span className="font-bold text-foreground">{selectedApplicant.job_title}</span>
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedApplicant.status)}
                </div>
              </DialogHeader>

              {/* Candidate Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Contact Information</span>
                  <div className="mt-1 font-semibold text-foreground">{selectedApplicant.applicant_email}</div>
                  {selectedApplicant.applicant_phone && (
                    <div className="text-muted-foreground">{selectedApplicant.applicant_phone}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Experience & Current Org</span>
                  <div className="mt-1 font-semibold text-foreground">
                    {selectedApplicant.experience_years || "Experience not specified"}
                  </div>
                  {selectedApplicant.current_organization && (
                    <div className="text-muted-foreground">Org: {selectedApplicant.current_organization}</div>
                  )}
                </div>
              </div>

              {/* Resume / Portfolio Link */}
              {selectedApplicant.resume_url && (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <div>
                      <div className="font-bold text-xs">Curriculum Vitae / Resume Attached</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">{selectedApplicant.resume_url}</div>
                    </div>
                  </div>
                  <Button asChild size="sm" className="h-8 gap-1.5 font-bold text-xs">
                    <a href={selectedApplicant.resume_url} target="_blank" rel="noopener noreferrer">
                      Open Resume <ExternalLink className="size-3" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplicant.cover_letter && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Cover Letter / Introduction Note</Label>
                  <div className="text-xs leading-relaxed bg-card p-3 rounded-lg border max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedApplicant.cover_letter}
                  </div>
                </div>
              )}

              {/* Reviewer Notes */}
              {selectedApplicant.notes && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Internal Hiring Remarks</Label>
                  <div className="text-xs bg-muted/40 p-2.5 rounded-lg border italic">
                    {selectedApplicant.notes}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <DialogFooter className="border-t pt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenStatusModal(selectedApplicant)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <UserCheck className="size-3.5 text-primary" />
                  Update Candidate Stage
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectedApplicant(null)}
                  className="text-xs font-bold"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UPDATE STATUS MODAL */}
      <Dialog open={Boolean(statusModalApplicant)} onOpenChange={(open) => !open && setStatusModalApplicant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="size-4 text-primary" />
              Update Candidate Hiring Stage
            </DialogTitle>
            <DialogDescription className="text-xs">
              {statusModalApplicant?.applicant_name} · {statusModalApplicant?.job_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold">Recruitment Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">In Review / Pending</SelectItem>
                  <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="Interviewing">Interviewing</SelectItem>
                  <SelectItem value="Hired">Hired / Selected</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Reviewer Feedback & Interview Notes</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Cleared technical round; scheduled for Dean interview on Friday"
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusModalApplicant(null)}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              className="gap-1.5 font-bold"
            >
              {updatingStatus && <Loader2 className="size-3.5 animate-spin" />}
              Save Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
