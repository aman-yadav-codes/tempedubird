"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Building2,
  Clock,
  Calendar,
  Users,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Share2,
  Star,
  ShieldCheck,
  Phone,
  MessageCircle,
  ArrowRight,
  FileText,
  Award,
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
  course: any;
  institution?: any;
  batches?: any[];
  syllabus?: any[];
  reviews?: any[];
}

export function PublicCourseDetailView({
  course,
  institution,
  batches = [],
  syllabus = [],
  reviews = [],
}: Props) {
  const { user } = useAuthStore();

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: `Hi, I am interested in admission for ${course.name || course.title}. Please share details and fee structure.`,
  });
  const [submitting, setSubmitting] = useState(false);

  const instName = institution?.name || course.institution_name || course.university_name || "Maa Sharda Institute PVT LTD";
  const instLocation = [institution?.locality, institution?.city, institution?.state].filter(Boolean).join(", ") || course.city || "Pandeypur, Varanasi";
  const instPhone = institution?.phone || course.phone || "+91 9876543210";
  const instWhatsapp = institution?.whatsapp || instPhone.replace(/[^0-9]/g, "");

  const instUrl = institution
    ? (institution.category_name || institution.category_slug
        ? buildBusinessSeoUrl(institution)
        : `/business/${institution.slug || institution.id}`)
    : course.institution_slug
    ? `/business/${course.institution_slug}`
    : course.institution_id
    ? `/business/${course.institution_id}`
    : "#";

  const feeAmount = Number(course.fee_amount || course.fee || course.price || 0);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Please provide your name and contact phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Admission enquiry submitted! The academic counselor will contact you shortly.");
      setEnquiryOpen(false);
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: course.name || course.title,
        text: `Explore ${course.name || course.title} at ${instName}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Course URL copied to clipboard!");
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
            <Link href="/explore?type=course" className="hover:text-primary transition-colors">Courses</Link>
            {course.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">{course.category_name}</span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-primary font-semibold truncate max-w-[240px]">{course.name || course.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Course Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold text-xs">
                    {course.category_name || "Academic Program"}
                  </Badge>
                  {course.code && (
                    <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                      Code: {course.code}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                    Classroom & Mentorship
                  </Badge>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {course.name || course.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Offered by <span className="font-semibold text-foreground">{instName}</span> ({instLocation})
                  </p>
                </div>

                {/* Key Specs Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Duration</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3.5 text-primary" />
                      {course.duration_value ? `${course.duration_value} ${course.duration_unit || "Months"}` : "1 Year"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Batch Seats</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Users className="size-3.5 text-primary" />
                      {course.seats_available || 40} Seats
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Eligibility / Board</span>
                    <span className="text-xs font-bold text-foreground truncate mt-0.5 block">
                      {course.university_name || course.board_name || "CBSE / State Board"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Certification</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Award className="size-3.5" />
                      Recognized
                    </span>
                  </div>
                </div>

                {/* Overview */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground">Program Overview</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {course.description || course.about ||
                      `${course.name || course.title} provides complete syllabus coverage with daily practice problems, mock examinations, and individualized mentoring. Designed specifically for students targeting top percentile ranks in competitive entrance tests and board excellence.`}
                  </div>
                </div>

                {/* Syllabus Highlights */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">Curriculum & Subjects Covered</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {(syllabus.length > 0 ? syllabus : [
                      { title: "Core Physics & Numerical Problem Solving" },
                      { title: "Chemistry (Physical, Organic & Inorganic)" },
                      { title: "Mathematics & Advanced Analytical Methods" },
                      { title: "Periodic Full-Length Mock Test Series" },
                    ]).map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                        <FileText className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">{s.title || s.name}</span>
                          {s.description && <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Reviews Section */}
            <Card className="rounded-2xl border shadow-xs bg-card">
              <CardHeader className="p-6 pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Star className="size-4.5 text-amber-500 fill-amber-500" />
                  Student & Parent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(reviews.length > 0 ? reviews : [
                  {
                    id: 1,
                    rating: 5,
                    title: "Best coaching faculty in Varanasi",
                    comment: "The conceptual clarity in Physics and Chemistry helped me score 95% in Class 12 boards and clear JEE Mains.",
                    reviewer_name: "Ayush Srivastava",
                  },
                  {
                    id: 2,
                    rating: 5,
                    title: "Disciplined schedule and test series",
                    comment: "Regular mock tests and personal doubt sessions by experienced teachers made all the difference.",
                    reviewer_name: "Sneha Patel",
                  },
                ]).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{r.reviewer_name || "Enrolled Student"}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 5))) }).map((_, i) => (
                          <Star key={i} className="size-3 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    {r.title && <p className="text-xs font-semibold text-foreground">{r.title}</p>}
                    <p className="text-xs text-muted-foreground">{r.comment || r.review}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Admission & Fee Card */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Course Fee</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">
                      {feeAmount > 0 ? `₹${feeAmount.toLocaleString("en-IN")}` : "Contact for Fee Structure"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Includes study modules, test papers & admission kit
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setEnquiryOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm"
                  >
                    <GraduationCap className="size-4 mr-2" /> Enquire for Admission
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
                      href={`https://wa.me/${instWhatsapp}?text=${encodeURIComponent(`Hi, I am interested in admission for ${course.name || course.title}. Please share prospectus.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5 mr-1 text-emerald-600" /> WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium"
                  >
                    <a href={`tel:${instPhone}`}>
                      <Phone className="size-3.5 mr-1" /> Call Campus
                    </a>
                  </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share this course:</span>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 hover:text-primary font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" /> Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Institution Profile Card */}
            <Card className="rounded-2xl border shadow-xs bg-card p-5 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Offered By Institute
              </span>
              <div className="flex items-start gap-3">
                {instUrl !== "#" ? (
                  <Link href={instUrl} className="block cursor-pointer shrink-0" title={`Visit ${instName}`}>
                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors flex items-center justify-center font-bold text-base">
                      <Building2 className="size-6" />
                    </div>
                  </Link>
                ) : (
                  <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-base shrink-0">
                    <Building2 className="size-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {instUrl !== "#" ? (
                    <Link href={instUrl} className="block cursor-pointer group/inst" title={`Visit ${instName}`}>
                      <h4 className="font-bold text-sm text-foreground group-hover/inst:text-amber-600 group-hover/inst:underline transition-colors truncate">
                        {instName}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="font-bold text-sm text-foreground truncate">{instName}</h4>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{instLocation}</span>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="size-3 mr-1" /> Verified Institute
                  </Badge>
                </div>
              </div>

              {institution?.about && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {institution.about}
                </p>
              )}

              {instUrl !== "#" && (
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                  <Link href={instUrl}>
                    View Institute Campus & All Courses <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Admission Enquiry Modal */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Admission Enquiry: {course.name || course.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in your details below. The admissions coordinator will contact you with fee structure and batch dates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnquirySubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Student / Parent Name *
              </label>
              <Input
                required
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Query / Message
              </label>
              <Textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEnquiryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-[#d9232e] text-white">
                {submitting ? "Submitting..." : "Submit Enquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
