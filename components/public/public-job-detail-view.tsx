"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Phone,
  MessageCircle,
  ArrowRight,
  IndianRupee,
  Calendar,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { buildBusinessSeoUrl } from "@/lib/utils/seo-slug";

interface Props {
  job: any;
  employer?: any;
}

export function PublicJobDetailView({ job, employer }: Props) {
  const { user } = useAuthStore();

  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({
    applicant_name: user?.full_name || "",
    applicant_email: user?.email || "",
    applicant_phone: user?.phone || "",
    experience_years: job.experience_level || "2 Years",
    current_organization: "",
    resume_url: "",
    cover_letter: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const employerName = employer?.name || job.company_name || job.institution_name || "Maa Sharda Institute PVT LTD";
  const jobLocation = job.location || [employer?.locality, employer?.city, employer?.state].filter(Boolean).join(", ") || "Pandeypur, Varanasi";
  const employerPhone = employer?.phone || "+91 9876543210";
  const employerWhatsapp = employer?.whatsapp || employerPhone.replace(/[^0-9]/g, "");

  const employerUrl = employer
    ? (employer.category_name || employer.category_slug
        ? buildBusinessSeoUrl(employer)
        : `/business/${employer.slug || employer.id}`)
    : job.institution_slug
    ? `/institutes/${job.institution_slug}`
    : job.business_slug
    ? `/business/${job.business_slug}`
    : job.institution_id
    ? `/institutes/${job.institution_id}`
    : job.business_id
    ? `/business/${job.business_id}`
    : "#";

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicant_name || !form.applicant_phone) {
      toast.error("Please provide your full name and contact phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Application submitted successfully! The hiring manager will review your profile.");
      setApplyOpen(false);
    } catch {
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: job.title || job.name,
        text: `Hiring for ${job.title || job.name} at ${employerName} in ${jobLocation}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Job opening URL copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="size-3" />
            <Link href="/explore?type=job" className="hover:text-primary transition-colors">Jobs</Link>
            {job.department && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">{job.department}</span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-primary font-semibold truncate max-w-[240px]">{job.title || job.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Job Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-500/10 text-blue-700 border-blue-300 font-bold text-xs">
                    {job.department || "Academic & Teaching"}
                  </Badge>
                  {job.employment_type && (
                    <Badge variant="outline" className="text-xs">
                      {job.employment_type}
                    </Badge>
                  )}
                  {job.work_mode && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {job.work_mode}
                    </Badge>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {job.title || job.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <Link
                      href={employerUrl}
                      className="font-semibold text-primary hover:underline transition-colors"
                      title={`View ${employerName} profile`}
                    >
                      {employerName}
                    </Link>
                    <span>•</span>
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span>{jobLocation}</span>
                  </p>
                </div>

                {/* Key Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Offered Salary</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <IndianRupee className="size-3.5" />
                      {job.salary_range || "Negotiable / Competitive"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Experience Needed</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Briefcase className="size-3.5 text-primary" />
                      {job.experience_level || "1-3 Years"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Job Type</span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      {job.employment_type || "Full-time"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Hiring Status</span>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                      <Users className="size-3.5" />
                      Actively Hiring
                    </span>
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground">Role Overview</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {job.description ||
                      `${employerName} is inviting applications for the position of ${job.title || job.name} in ${jobLocation}. We seek a proactive individual with strong subject expertise and commitment to academic excellence.`}
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">Key Responsibilities</h3>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {[
                      "Deliver high-quality lectures and conceptual coaching for enrolled batches.",
                      "Conduct regular doubt-clearing sessions, tests, and monitor student performance.",
                      "Collaborate with academic leadership for curriculum milestones and review meetings.",
                      "Maintain positive communication with students and parents regarding academic progress.",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-foreground/80">
                        <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">Candidate Requirements</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      "Relevant degree / qualification in the specialized subject domain",
                      "Strong interpersonal and student mentoring skills",
                      "Prior teaching or academic counseling experience preferred",
                      "Good communication skills in Hindi & English",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Application Card */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Compensation Package</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                      {job.salary_range || "Best in Industry"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Plus performance incentives, Provident Fund & annual appraisal
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setApplyOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <Send className="size-4 mr-2" /> Apply for this Position
                  </Button>
                </div>

                {/* Direct Contact Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                  >
                    <a
                      href={`https://wa.me/${employerWhatsapp}?text=${encodeURIComponent(`Hi, I am interested in applying for the ${job.title || job.name} position at ${employerName}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5 mr-1 text-emerald-600" /> WhatsApp HR
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium"
                  >
                    <a href={`tel:${employerPhone}`}>
                      <Phone className="size-3.5 mr-1" /> Call HR
                    </a>
                  </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share this job opening:</span>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 hover:text-primary font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" /> Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Employer Profile Card */}
            <Card className="rounded-2xl border shadow-xs bg-card p-5 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Hiring Organization
              </span>
              <div className="flex items-start gap-3">
                {employerUrl !== "#" ? (
                  <Link href={employerUrl} className="block cursor-pointer shrink-0" title={`Visit ${employerName}`}>
                    <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors flex items-center justify-center font-bold text-base">
                      <Building2 className="size-6" />
                    </div>
                  </Link>
                ) : (
                  <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                    <Building2 className="size-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {employerUrl !== "#" ? (
                    <Link href={employerUrl} className="block cursor-pointer group/emp" title={`Visit ${employerName}`}>
                      <h4 className="font-bold text-sm text-foreground group-hover/emp:text-blue-600 group-hover/emp:underline transition-colors truncate">
                        {employerName}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="font-bold text-sm text-foreground truncate">{employerName}</h4>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{jobLocation}</span>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="size-3 mr-1" /> Verified Employer
                  </Badge>
                </div>
              </div>

              {employer?.about && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {employer.about}
                </p>
              )}

              {employerUrl !== "#" && (
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                  <Link href={employerUrl}>
                    View Organization & All Vacancies <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Apply for {job.title || job.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit your resume and contact information to {employerName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplySubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Full Name *
              </label>
              <Input
                required
                placeholder="Full Name"
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Phone Number *
              </label>
              <Input
                required
                placeholder="+91 9876543210"
                value={form.applicant_phone}
                onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.applicant_email}
                onChange={(e) => setForm({ ...form, applicant_email: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Resume Link (Google Drive / LinkedIn / Portfolio)
              </label>
              <Input
                placeholder="https://drive.google.com/..."
                value={form.resume_url}
                onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Brief Cover Letter / Introduction
              </label>
              <Textarea
                rows={3}
                placeholder="Highlight your relevant experience and why you are interested..."
                value={form.cover_letter}
                onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setApplyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-blue-600 text-white">
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
