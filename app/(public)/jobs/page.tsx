"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Users,
  Send,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { StaffJobPosting } from "@/lib/queries/jobs";

const DEPARTMENTS = [
  "All Departments",
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

const EMPLOYMENT_TYPES = [
  "All Types",
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Visiting Faculty",
];

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<StaffJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [selectedType, setSelectedType] = useState("All Types");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  // Application dialog
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<StaffJobPosting | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appForm, setAppForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    experience_years: "1-3 Years",
    current_organization: "",
    resume_url: "",
    cover_letter: "",
  });

  // Details dialog
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<StaffJobPosting | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
      });
      if (search.trim()) params.set("search", search.trim());
      if (selectedDept !== "All Departments") params.set("department", selectedDept);
      if (selectedType !== "All Types") params.set("employmentType", selectedType);

      const res = await fetch(`/api/public/jobs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jobs");

      setJobs(json.data || []);
      setTotal(json.total || 0);
      setPageCount(json.pageCount || 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedDept, selectedType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchJobs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  function handleOpenApply(job: StaffJobPosting) {
    setSelectedJob(job);
    setSubmitted(false);
    setAppForm({
      applicant_name: "",
      applicant_email: "",
      applicant_phone: "",
      experience_years: "1-3 Years",
      current_organization: "",
      resume_url: "",
      cover_letter: "",
    });
    setApplyModalOpen(true);
  }

  function handleOpenDetails(job: StaffJobPosting) {
    setViewingJob(job);
    setDetailsModalOpen(true);
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob) return;

    if (!appForm.applicant_name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!appForm.applicant_email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob.id,
          ...appForm,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit application");

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Briefcase className="size-3.5" />
            Careers & Campus Recruitment
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-foreground">
            Explore Opportunities & Faculty Openings
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
            Discover teaching positions, research roles, and administrative careers at top educational institutions and universities.
          </p>

          {/* Search Box */}
          <div className="pt-4 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search job title, subject, or location..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-11 text-sm bg-card shadow-sm"
              />
            </div>
            <Select
              value={selectedType}
              onValueChange={(val) => {
                setSelectedType(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-sm sm:w-48 bg-card shadow-sm">
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

          {/* Department Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => {
                  setSelectedDept(dept);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedDept === dept
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs Grid */}
      <section className="container mx-auto px-4 pt-10">
        <div className="flex items-center justify-between pb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {total} Open Position{total !== 1 ? "s" : ""} Available
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing active vacancies matching your search criteria
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Loader2 className="size-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading job vacancies...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-16 text-center space-y-3 bg-card/50">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Briefcase className="size-6" />
            </div>
            <h3 className="text-lg font-bold">No Openings Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn&apos;t find any active job postings matching your filter. Try adjusting your search query or department.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedDept("All Departments");
                setSelectedType("All Types");
              }}
              className="text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="flex flex-col justify-between border bg-card transition-all duration-200 hover:shadow-lg hover:border-primary/40 group"
              >
                <CardHeader className="p-5 pb-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                      {job.department}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {job.employment_type}
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </CardTitle>
                    {job.institution_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Building2 className="size-3.5 text-primary/70 shrink-0" />
                        <span className="font-semibold text-foreground/90 truncate">{job.institution_name}</span>
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t text-xs text-muted-foreground">
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
                      <span className="truncate font-semibold text-foreground/90">{job.salary_range || "Competitive"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{job.openings_count} Openings</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenDetails(job)}
                      className="flex-1 h-9 text-xs font-semibold"
                    >
                      View Details
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleOpenApply(job)}
                      className="flex-1 h-9 text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <Send className="size-3.5" />
                      Apply Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Job Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-bold text-primary bg-primary/10">
                {viewingJob?.department}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {viewingJob?.employment_type}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold">{viewingJob?.title}</DialogTitle>
            <DialogDescription>
              {viewingJob?.institution_name ? viewingJob.institution_name : "Campus Recruitment Vacancy"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-bold text-foreground mt-0.5">{viewingJob?.location || "Campus"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Experience</p>
                <p className="font-bold text-foreground mt-0.5">{viewingJob?.experience_level || "1-3 Yrs"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Compensation</p>
                <p className="font-bold text-foreground mt-0.5">{viewingJob?.salary_range || "Negotiable"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Work Mode</p>
                <p className="font-bold text-foreground mt-0.5">{viewingJob?.work_mode || "On-site"}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1">Job Description</h4>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {viewingJob?.description}
              </p>
            </div>

            {viewingJob?.requirements && (
              <div>
                <h4 className="font-bold text-foreground mb-1">Requirements & Qualifications</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {viewingJob.requirements}
                </p>
              </div>
            )}

            {viewingJob?.benefits && (
              <div>
                <h4 className="font-bold text-foreground mb-1">Perks & Benefits</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {viewingJob.benefits}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDetailsModalOpen(false);
                if (viewingJob) handleOpenApply(viewingJob);
              }}
              className="font-bold gap-1.5"
            >
              <Send className="size-3.5" />
              Apply for this Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Submission Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="size-8" />
              </div>
              <DialogTitle className="text-xl font-bold">Application Submitted!</DialogTitle>
              <DialogDescription className="max-w-sm mx-auto">
                Thank you for applying for <strong>{selectedJob?.title}</strong>. The recruitment team has received your application and will review your profile.
              </DialogDescription>
              <Button onClick={() => setApplyModalOpen(false)} className="mt-4 font-bold">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication}>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Apply for {selectedJob?.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedJob?.institution_name || "Submit your profile and contact details."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="app-name">Full Name *</Label>
                  <Input
                    id="app-name"
                    required
                    value={appForm.applicant_name}
                    onChange={(e) => setAppForm({ ...appForm, applicant_name: e.target.value })}
                    placeholder="Dr. / Prof. / Mr. / Ms. Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="app-email">Email Address *</Label>
                    <Input
                      id="app-email"
                      type="email"
                      required
                      value={appForm.applicant_email}
                      onChange={(e) => setAppForm({ ...appForm, applicant_email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="app-phone">Phone / WhatsApp</Label>
                    <Input
                      id="app-phone"
                      type="tel"
                      value={appForm.applicant_phone}
                      onChange={(e) => setAppForm({ ...appForm, applicant_phone: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="app-exp">Total Experience</Label>
                    <Input
                      id="app-exp"
                      value={appForm.experience_years}
                      onChange={(e) => setAppForm({ ...appForm, experience_years: e.target.value })}
                      placeholder="e.g. 3 Years / Fresher"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="app-org">Current Organization</Label>
                    <Input
                      id="app-org"
                      value={appForm.current_organization}
                      onChange={(e) => setAppForm({ ...appForm, current_organization: e.target.value })}
                      placeholder="e.g. XYZ University / School"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="app-resume">Resume / CV / Portfolio Link</Label>
                  <Input
                    id="app-resume"
                    type="url"
                    value={appForm.resume_url}
                    onChange={(e) => setAppForm({ ...appForm, resume_url: e.target.value })}
                    placeholder="https://drive.google.com/... or LinkedIn URL"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Provide a Google Drive, LinkedIn, or personal portfolio link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="app-cover">Cover Note / Brief Introduction</Label>
                  <Textarea
                    id="app-cover"
                    rows={3}
                    value={appForm.cover_letter}
                    onChange={(e) => setAppForm({ ...appForm, cover_letter: e.target.value })}
                    placeholder="Share a brief overview of your teaching expertise, subjects, or qualifications..."
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="font-bold gap-1.5">
                  {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Send className="size-3.5" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
