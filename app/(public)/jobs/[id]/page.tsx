"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  IndianRupee,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Share2,
  Sparkles,
  Users,
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
import type { StaffJobPosting } from "@/lib/queries/jobs";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const [job, setJob] = useState<StaffJobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // Application dialog
  const [applyModalOpen, setApplyModalOpen] = useState(false);
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

  // Enquiry dialog
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/jobs/${id}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        setNotFoundState(true);
        return;
      }
      setJob(json.data);
    } catch {
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchJob();
  }, [fetchJob]);

  function handleOpenApply() {
    setSubmitted(false);
    setAppForm({
      applicant_name: "",
      applicant_email: "",
      applicant_phone: "",
      experience_years: job?.experience_level || "1-3 Years",
      current_organization: "",
      resume_url: "",
      cover_letter: "",
    });
    setApplyModalOpen(true);
  }

  function handleOpenWhatsapp() {
    if (!job) return;
    const text = `Hello, I am interested in the ${job.title} vacancy (${job.department}) at ${job.institution_name || "EduBird"}. Please provide more details.`;
    window.open(`https://wa.me/919999999999?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleCall() {
    window.location.href = "tel:+919999999999";
  }

  function handleOpenEnquiry() {
    if (!job) return;
    setEnquirySubmitted(false);
    setEnquiryForm({
      name: "",
      email: "",
      phone: "",
      message: `Hi, I am interested in the ${job.title} (${job.department}) position. Could you please share more information regarding the selection process and timings?`,
    });
    setEnquiryModalOpen(true);
  }

  async function handleEnquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    if (!enquiryForm.name.trim() || !enquiryForm.phone.trim()) {
      toast.error("Please provide your name and phone number");
      return;
    }
    setEnquirySubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setEnquirySubmitted(true);
      toast.success("Enquiry submitted successfully! Our recruitment team will get in touch with you shortly.");
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setEnquirySubmitting(false);
    }
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;

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
          job_id: job.id,
          ...appForm,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit application");

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply for job");
    } finally {
      setSubmitting(false);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: job?.title,
        text: `Check out this opening for ${job?.title} at ${job?.institution_name || "EduBird"}!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Job URL copied to clipboard!");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Loading position details...</p>
      </div>
    );
  }

  if (notFoundState || !job) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <Briefcase className="size-12 text-muted-foreground/40 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground mb-1">Job Opening Not Found</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This job vacancy is either no longer accepting applications or has been closed.
        </p>
        <Button asChild>
          <Link href="/jobs" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to All Openings
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            All Job Positions
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="h-8 text-xs font-medium gap-1.5"
          >
            <Share2 className="size-3.5" />
            Share Vacancy
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="container mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Job Content (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                  {job.department}
                </Badge>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {job.employment_type}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium">
                  {job.work_mode || "On-site"}
                </Badge>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {job.title}
                </h1>
                {job.institution_name && (
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5 mt-2">
                    <Building2 className="size-4 shrink-0" />
                    <span>{job.institution_name}</span>
                  </p>
                )}
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground/80" /> Location
                  </span>
                  <p className="font-bold text-foreground mt-1 truncate">{job.location || "Campus"}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="size-3 text-muted-foreground/80" /> Experience
                  </span>
                  <p className="font-bold text-foreground mt-1 truncate">{job.experience_level || "1-3 Yrs"}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="size-3 text-muted-foreground/80" /> Salary
                  </span>
                  <p className="font-bold text-foreground mt-1 truncate">{job.salary_range || "Competitive"}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="size-3 text-muted-foreground/80" /> Openings
                  </span>
                  <p className="font-bold text-foreground mt-1">{job.openings_count} Vacancies</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border bg-card p-6 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Briefcase className="size-4 text-primary" />
                Role Overview & Job Description
              </h2>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="rounded-xl border bg-card p-6 shadow-xs space-y-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  Key Requirements & Qualifications
                </h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.requirements}
                </div>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div className="rounded-xl border bg-card p-6 shadow-xs space-y-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Perks, Growth & Benefits
                </h2>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.benefits}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar CTA & Contact Info (Right 1 col) */}
          <div className="space-y-5">
            <div className="rounded-xl border bg-card p-6 shadow-md space-y-5 sticky top-16">
              <div>
                <h3 className="font-bold text-lg text-foreground">Interested in this role?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit your application directly or connect with our recruitment desk.
                </p>
              </div>

              {/* Primary Apply Button */}
              <Button
                size="lg"
                onClick={handleOpenApply}
                className="w-full font-bold gap-2 text-sm shadow-md"
              >
                <Send className="size-4" />
                Apply for this Position
              </Button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-muted-foreground">Quick Contact</span>
                <div className="flex-grow border-t border-muted"></div>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenWhatsapp}
                  className="w-full justify-start h-10 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 gap-2.5"
                >
                  <MessageCircle className="size-4 text-emerald-600" />
                  Chat on WhatsApp
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCall}
                  className="w-full justify-start h-10 text-xs font-semibold border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:border-blue-500/40 gap-2.5"
                >
                  <Phone className="size-4 text-blue-600" />
                  Call Recruitment Desk
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenEnquiry}
                  className="w-full justify-start h-10 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/40 gap-2.5"
                >
                  <HelpCircle className="size-4 text-amber-600" />
                  Send Quick Enquiry
                </Button>
              </div>

              {/* Recruitment Info */}
              <div className="rounded-lg bg-muted/40 p-3.5 border text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-between">
                  <span>Application Status:</span>
                  <span className="font-semibold text-emerald-600">Active & Hiring</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center justify-between">
                    <span>Deadline:</span>
                    <span className="font-semibold text-foreground">{job.deadline}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Department:</span>
                  <span className="font-semibold text-foreground">{job.department}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                Thank you for applying for <strong>{job.title}</strong>. The recruitment team has received your application and will review your profile.
              </DialogDescription>
              <Button onClick={() => setApplyModalOpen(false)} className="mt-4 font-bold">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication}>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Apply for {job.title}
                </DialogTitle>
                <DialogDescription>
                  {job.institution_name || "Submit your profile and contact details."}
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

      {/* Quick Enquiry Modal */}
      <Dialog open={enquiryModalOpen} onOpenChange={setEnquiryModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
          {enquirySubmitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="size-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <Check className="size-8" />
              </div>
              <DialogTitle className="text-xl font-bold">Enquiry Submitted!</DialogTitle>
              <DialogDescription className="max-w-sm mx-auto">
                Thank you for your enquiry regarding <strong>{job.title}</strong>. Our campus recruitment desk will get back to you shortly.
              </DialogDescription>
              <Button onClick={() => setEnquiryModalOpen(false)} className="mt-4 font-bold">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEnquirySubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <HelpCircle className="size-5 text-amber-600" />
                  Job Enquiry / Question
                </DialogTitle>
                <DialogDescription>
                  Have a question about <strong className="text-foreground">{job.title}</strong> ({job.department})? Send us a quick enquiry.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="detail-enq-name">Full Name *</Label>
                  <Input
                    id="detail-enq-name"
                    required
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    placeholder="e.g. Ankit Sharma"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-enq-phone">Phone / WhatsApp *</Label>
                    <Input
                      id="detail-enq-phone"
                      type="tel"
                      required
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-enq-email">Email Address</Label>
                    <Input
                      id="detail-enq-email"
                      type="email"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="detail-enq-msg">Message / Query *</Label>
                  <Textarea
                    id="detail-enq-msg"
                    rows={3}
                    required
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    placeholder="Ask about job location, timings, syllabus requirements, compensation, etc."
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setEnquiryModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={enquirySubmitting} className="font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  {enquirySubmitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Send className="size-3.5" />}
                  Submit Enquiry
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
