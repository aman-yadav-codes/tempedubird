"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  Building2,
  Users,
  Award,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Star,
  School,
  ChevronRight,
  Quote,
  Target,
  Eye,
  FileText,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export function InstitutionalAdminLanding() {
  const { user } = useAuthStore();
  const { activeInstitution, activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [featuredPrograms, setFeaturedPrograms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Enquiry Form state
  const [enqName, setEnqName] = useState("");
  const [enqEmail, setEnqEmail] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqCourse, setEnqCourse] = useState("");
  const [enqMessage, setEnqMessage] = useState("");
  const [submittingEnq, setSubmittingEnq] = useState(false);

  const resolvedInstId = activeInstitutionId || user?.memberships?.[0]?.institution_id || defaultEnvInstitutionId;

  useEffect(() => {
    async function loadInstituteHome() {
      setLoading(true);
      try {
        const [instRes, progRes, teachRes, blogRes, facRes] = await Promise.all([
          resolvedInstId
            ? fetch(`/api/public/institution/info?institutionId=${resolvedInstId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/public/courses?limit=12${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/public/teachers?limit=12${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/public/blogs?limit=6${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/public/facilities?limit=8${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (instRes?.data) setInstitutionData(instRes.data);
        if (progRes?.data && Array.isArray(progRes.data)) {
          setFeaturedPrograms(progRes.data);
          if (progRes.data.length > 0 && !enqCourse) {
            setEnqCourse(progRes.data[0].title || progRes.data[0].name);
          }
        }
        if (teachRes?.teachers && Array.isArray(teachRes.teachers)) setTeachers(teachRes.teachers);
        else if (teachRes?.data && Array.isArray(teachRes.data)) setTeachers(teachRes.data);
        if (blogRes?.blogs && Array.isArray(blogRes.blogs)) setBlogs(blogRes.blogs);
        if (facRes?.facilities && Array.isArray(facRes.facilities)) setFacilities(facRes.facilities);
      } catch (e) {
        console.error("Error loading institute homepage data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadInstituteHome();
  }, [resolvedInstId]);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      if (user.full_name && !enqName) setEnqName(user.full_name);
      if (user.email && !enqEmail) setEnqEmail(user.email);
      if (user.phone && !enqPhone) setEnqPhone(user.phone);
    }
  }, [user]);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enqName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setSubmittingEnq(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        const storedToken = window.localStorage.getItem("accessToken") || window.localStorage.getItem("token");
        if (storedToken) headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers,
        body: JSON.stringify({
          institution_id: resolvedInstId || undefined,
          student_name: enqName.trim(),
          email: enqEmail.trim(),
          phone: enqPhone.trim() || (user?.phone || ""),
          preferred_program: enqCourse || "General Course Inquiry",
          source: "Institutional Landing Admission Desk",
          notes: enqMessage.trim() || `Admissions enquiry for ${enqCourse || "programs"}`,
          user_id: user?.id || null,
        }),
      });
      if (res.ok) {
        toast.success("Thank you! Your admission enquiry has been submitted. Our counsellor will contact you shortly.");
        if (!user) {
          setEnqName("");
          setEnqEmail("");
          setEnqPhone("");
        }
        setEnqMessage("");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("student_enrollment_updated"));
        }
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.error || "Failed to submit enquiry. Please try again.");
      }
    } catch {
      toast.error("Network error while submitting enquiry.");
    } finally {
      setSubmittingEnq(false);
    }
  };

  // Base Institution Properties (Strictly resolved from active institution record)
  const instName = institutionData?.name || activeInstitution?.name || user?.memberships?.[0]?.institution_name || "Campus Portal";
  const instLogo = institutionData?.logo_url || (activeInstitution as any)?.logo_url;
  const instAbout = institutionData?.about || "";
  const instMission = institutionData?.mission || "";
  const instVision = institutionData?.vision || "";
  const instGoal = institutionData?.goal || "";
  const instLocation = institutionData?.location_name || institutionData?.branches?.[0]?.city || institutionData?.city || "Campus";
  const instPhone = institutionData?.phone || institutionData?.branches?.[0]?.phones?.[0]?.phone || "";
  const instEmail = institutionData?.email || institutionData?.branches?.[0]?.emails?.[0]?.email || "";
  const establishedYear = institutionData?.established_year;

  // Founder Information (Only if entered by institution admin)
  const hasFounder = Boolean(institutionData?.founder_name || institutionData?.founder_about);
  const founderName = institutionData?.founder_name || "";
  const founderTitle = institutionData?.founder_title || "Founder & Chairman";
  const founderImage = institutionData?.founder_image_url || null;
  const founderAbout = institutionData?.founder_about || "";

  // Mission/Vision/Goal flags (Only if entered)
  const hasMissionVisionGoal = Boolean(instMission || instVision || instGoal);

  // Branches list (Only what admin added)
  const branches: any[] = Array.isArray(institutionData?.branches) ? institutionData.branches : [];
  const hasBranches = branches.length > 0;

  // Dynamic Theme Color
  const brandPrimary = institutionData?.theme_color || "#800000";
  const brandPrimaryLight = `${brandPrimary}15`;

  if (loading && !institutionData && !activeInstitution?.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading campus portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* 1. TOP TICKER: NOTICEBOARD & ADMISSION HOTLINE */}
      <div
        className="text-white text-xs font-semibold py-2 px-4 border-b transition-colors shadow-xs"
        style={{ backgroundColor: brandPrimary }}
      >
        <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Badge variant="secondary" className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase shrink-0">
              Campus Portal
            </Badge>
            <div className="truncate text-rose-100 flex items-center gap-3">
              <span>{instName}</span>
              {establishedYear && (
                <>
                  <span>•</span>
                  <span>Est. {establishedYear}</span>
                </>
              )}
              {instLocation && (
                <>
                  <span>•</span>
                  <span>📍 {instLocation}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/90 shrink-0">
            {instPhone && (
              <a href={`tel:${instPhone.replace(/[^0-9]/g, "")}`} className="hover:underline flex items-center gap-1">
                <Phone className="h-3 w-3" /> {instPhone}
              </a>
            )}
            <Link href="/contact" className="hover:underline">
              Campus Contact
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PRESTIGIOUS HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-16 lg:py-24 border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        <div
          className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: brandPrimary }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Institution Crest & Accreditation Badge */}
              <div className="flex flex-wrap items-center gap-3">
                {instLogo ? (
                  <div className="relative h-12 w-12 rounded-xl bg-white p-1 shadow-md overflow-hidden shrink-0">
                    <Image src={instLogo} alt={instName} fill sizes="48px" className="object-contain" />
                  </div>
                ) : (
                  <div
                    className="h-11 w-11 rounded-xl text-white flex items-center justify-center font-black shadow-md shrink-0"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    <School className="h-6 w-6" />
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold shadow-sm backdrop-blur-md">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>{establishedYear ? `Established ${establishedYear}` : "Verified Institution"} • Academic Portal</span>
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                  {instName}
                </h1>
                <p className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-slate-100">
                  Empowering Future Leaders through Academic Excellence & Career Innovation
                </p>
              </div>

              {/* Subtitle / About Summary */}
              {instAbout && (
                <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                  {instAbout}
                </p>
              )}

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  size="lg"
                  className="text-white font-extrabold text-sm px-7 py-6 rounded-xl shadow-lg cursor-pointer"
                  style={{ backgroundColor: brandPrimary }}
                  asChild
                >
                  <a href="#admissions-section">
                    <Sparkles className="h-4 w-4 mr-2" /> Apply for Admission
                  </a>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 font-bold text-sm px-6 py-6 rounded-xl backdrop-blur-md cursor-pointer"
                  asChild
                >
                  <Link href="/about">
                    <School className="h-4 w-4 mr-2 text-amber-300" /> About Us
                  </Link>
                </Button>

                {featuredPrograms.length > 0 && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 font-bold text-sm px-6 py-6 rounded-xl backdrop-blur-md cursor-pointer"
                    asChild
                  >
                    <a href="#courses-section">
                      <BookOpen className="h-4 w-4 mr-2 text-rose-400" /> Explore Programs
                    </a>
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold text-xs px-4"
                  asChild
                >
                  <Link href="/contact">
                    <MapPin className="h-4 w-4 mr-1.5 text-primary" /> Contact & Helpdesk
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Hero Column: Admission Desk */}
            <div id="admissions-section" className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="rounded-3xl border border-white/15 bg-slate-900/90 shadow-2xl p-6 sm:p-7 backdrop-blur-xl space-y-5">
                  <div className="border-b border-white/10 pb-3 space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <GraduationCap className="h-4 w-4" /> Admission Desk
                    </div>
                    <h3 className="text-xl font-bold text-white">Instant Admission Guidance</h3>
                    <p className="text-xs text-slate-400">
                      Submit your details to receive syllabus, fee concessions & prospectus.
                    </p>
                  </div>

                  <form onSubmit={handleEnquirySubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Student Full Name *</label>
                      <Input
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={enqName}
                        onChange={(e) => setEnqName(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Email Address</label>
                        <Input
                          type="email"
                          placeholder="rahul@example.com"
                          value={enqEmail}
                          onChange={(e) => setEnqEmail(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Mobile Number *</label>
                        <Input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          value={enqPhone}
                          onChange={(e) => setEnqPhone(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-xs"
                        />
                      </div>
                    </div>

                    {featuredPrograms.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Program / Stream of Interest</label>
                        <select
                          value={enqCourse}
                          onChange={(e) => setEnqCourse(e.target.value)}
                          className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          {featuredPrograms.map((p) => (
                            <option key={p.id} value={p.title || p.name}>
                              {p.title || p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Questions or Query (Optional)</label>
                      <Textarea
                        rows={2}
                        placeholder="Inquire about hostel, scholarships, admission criteria..."
                        value={enqMessage}
                        onChange={(e) => setEnqMessage(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingEnq}
                      className="w-full text-white font-bold h-10 text-xs shadow-md cursor-pointer"
                      style={{ backgroundColor: brandPrimary }}
                    >
                      {submittingEnq ? "Submitting..." : "Submit Enquiry & Get Prospectus"}
                    </Button>
                  </form>

                  <p className="text-[11px] text-center text-slate-400">
                    🔒 Official counselling response directly from our admissions office.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT FOUNDER / LEADERSHIP SECTION (ONLY IF ADDED BY ADMIN) */}
      {hasFounder && (
        <section id="founder-section" className="py-16 lg:py-20 bg-muted/20 border-b border-border scroll-mt-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-10 items-center bg-card rounded-3xl p-8 lg:p-12 border border-border shadow-md">
              {/* Founder Portrait */}
              <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
                <div
                  className="relative h-60 w-60 sm:h-72 sm:w-72 rounded-3xl overflow-hidden border-4 shadow-xl"
                  style={{ borderColor: brandPrimary }}
                >
                  {founderImage ? (
                    <Image src={founderImage} alt={founderName} fill sizes="300px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 flex flex-col items-center justify-center text-white p-6">
                      <div
                        className="h-20 w-20 rounded-full flex items-center justify-center font-black text-2xl mb-3 shadow-inner"
                        style={{ backgroundColor: brandPrimary }}
                      >
                        {founderName ? founderName.split(" ").map((n: string) => n[0]).join("") : "ED"}
                      </div>
                      <p className="font-bold text-lg">{founderName || "Institution Leadership"}</p>
                      <p className="text-xs text-amber-300">{founderTitle}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground">{founderName}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">{founderTitle}</p>
                  <p className="text-xs font-bold text-primary mt-1">{instName}</p>
                </div>
              </div>

              {/* Founder Message */}
              <div className="lg:col-span-8 space-y-5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                >
                  <Quote className="h-3.5 w-3.5" />
                  <span>Leadership Message</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-snug">
                  &ldquo;Building a Legacy of Knowledge, Integrity, and Global Impact&rdquo;
                </h2>

                {founderAbout && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic border-l-4 pl-4" style={{ borderColor: brandPrimary }}>
                    &ldquo;{founderAbout}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. ABOUT INSTITUTION: MISSION, VISION & GOALS (ONLY IF ADDED BY ADMIN) */}
      {hasMissionVisionGoal && (
        <section className="py-16 lg:py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
              >
                <School className="h-3.5 w-3.5" /> About {instName}
              </div>
              <h2 className="text-3xl font-extrabold text-foreground">
                Our Vision, Mission & Goals
              </h2>
              <p className="text-sm text-muted-foreground">
                Committed to holistic academic development, research excellence, and student mentorship.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Vision Card */}
              {instVision && (
                <Card className="p-7 rounded-2xl border bg-card hover:border-primary/50 transition-all space-y-4 shadow-xs">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold"
                    style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                  >
                    <Eye className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Our Vision</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {instVision}
                  </p>
                </Card>
              )}

              {/* Mission Card */}
              {instMission && (
                <Card className="p-7 rounded-2xl border bg-card hover:border-primary/50 transition-all space-y-4 shadow-xs">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold"
                    style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                  >
                    <Target className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Our Mission</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {instMission}
                  </p>
                </Card>
              )}

              {/* Goal Card */}
              {instGoal && (
                <Card className="p-7 rounded-2xl border bg-card hover:border-primary/50 transition-all space-y-4 shadow-xs">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold"
                    style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                  >
                    <Award className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Strategic Goals</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {instGoal}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. COURSES & ACADEMIC PROGRAMS (ONLY IF ADDED BY ADMIN) */}
      {featuredPrograms.length > 0 && (
        <section id="courses-section" className="py-16 lg:py-20 bg-muted/20 border-b border-border">
          <div className="container mx-auto px-4 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                  style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Academic Programs
                </div>
                <h2 className="text-3xl font-extrabold text-foreground">
                  Degrees & Courses Offered
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Programs curriculum, duration, and admission availability.
                </p>
              </div>

              <Button variant="outline" asChild className="shrink-0 font-bold text-xs">
                <Link href="/courses">
                  View All Courses <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Program Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredPrograms.map((course: any, idx: number) => {
                const courseTitle = course.title || course.name || `Program ${idx + 1}`;
                const courseDuration = course.duration || "Full-Time";
                const courseLevel = course.degree_level || "Academic";
                const courseFee = course.annual_fee || course.fee;
                const courseBadge = course.badge || "Admissions Open";

                return (
                  <Card
                    key={course.id || idx}
                    className="rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-bold"
                          style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                        >
                          {courseLevel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {courseBadge}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {courseTitle}
                        </h3>
                        {course.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-muted/40 border border-border/60">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duration</span>
                          <span className="font-semibold text-foreground">{courseDuration}</span>
                        </div>
                        {courseFee ? (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Annual Fee</span>
                            <span className="font-semibold text-foreground">₹{courseFee}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Status</span>
                            <span className="font-semibold text-emerald-600">Open</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 pt-0 border-t border-border/40 mt-2 flex items-center justify-between gap-2 bg-muted/10">
                      <Button variant="ghost" size="sm" asChild className="text-xs font-semibold p-0">
                        <Link href={`/courses/${course.id}`}>
                          Course Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="font-bold text-xs h-8 text-white"
                        style={{ backgroundColor: brandPrimary }}
                        asChild
                      >
                        <a href="#admissions-section">Apply Now</a>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. TEACHERS & FACULTY (ONLY IF ADDED BY ADMIN) */}
      {teachers.length > 0 && (
        <section className="py-16 lg:py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                  style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                >
                  <Users className="h-3.5 w-3.5" /> Faculty & Mentors
                </div>
                <h2 className="text-3xl font-extrabold text-foreground">
                  Our Dedicated Educators
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Qualified teachers and subject specialists guiding our students.
                </p>
              </div>

              <Button variant="outline" asChild className="shrink-0 font-bold text-xs">
                <Link href="/teachers">
                  All Faculty Members <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {teachers.map((teacher: any, idx: number) => {
                const name = teacher.full_name || teacher.name || `Faculty ${idx + 1}`;
                const desig = teacher.designation || "Faculty Specialist";
                const qual = teacher.qualification || "";
                const exp = teacher.experience_years ? `${teacher.experience_years}+ Yrs Exp` : null;
                const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];

                return (
                  <Card
                    key={teacher.id || idx}
                    className="rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all p-5 space-y-4 text-center flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div
                        className="mx-auto h-20 w-20 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-md overflow-hidden relative"
                        style={{ backgroundColor: brandPrimary }}
                      >
                        {teacher.avatar_url ? (
                          <Image src={teacher.avatar_url} alt={name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <span>{name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-base text-foreground leading-snug">{name}</h4>
                        <p className="text-xs text-primary font-semibold mt-0.5">{desig}</p>
                        {qual && <p className="text-[11px] text-muted-foreground mt-1">{qual}</p>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 space-y-2">
                      {subjects.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {subjects.slice(0, 2).map((sub: string, sIdx: number) => (
                            <Badge key={sIdx} variant="secondary" className="text-[10px] font-medium">
                              {sub}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {exp && <span className="text-[11px] font-bold text-muted-foreground block">{exp}</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. BRANCHES & CAMPUS LOCATIONS (ONLY IF ADDED BY ADMIN) */}
      {hasBranches && (
        <section id="branches-section" className="py-16 lg:py-20 bg-muted/20 border-b border-border">
          <div className="container mx-auto px-4 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
              >
                <MapPin className="h-3.5 w-3.5" /> Campus Network
              </div>
              <h2 className="text-3xl font-extrabold text-foreground">
                Branch Offices & Campus Locations
              </h2>
              <p className="text-sm text-muted-foreground">
                Official regional branches and admission contact desks.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {branches.map((b: any, bIdx: number) => {
                const bName = b.branch_name || b.name || `Branch Office ${bIdx + 1}`;
                const bPhones = b.phones || [];
                const bEmails = b.emails || [];

                return (
                  <Card key={b.id || bIdx} className="rounded-2xl border bg-card p-6 shadow-xs space-y-5 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2 border-b pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-foreground leading-snug">{bName}</h3>
                          <p className="text-xs text-muted-foreground">{b.city ? `${b.city}, ${b.state || ""}` : "Campus Branch"}</p>
                        </div>
                        {b.is_primary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20 shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Main Campus
                          </span>
                        )}
                      </div>

                      {b.address && (
                        <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-relaxed font-medium">
                            {b.address}, {b.city} {b.state ? `, ${b.state}` : ""} {b.pincode ? ` - ${b.pincode}` : ""}
                          </span>
                        </div>
                      )}

                      {b.working_hours && (
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <span>{b.working_hours}</span>
                        </div>
                      )}
                    </div>

                    {/* Branch Contacts */}
                    <div className="space-y-2.5 pt-3 border-t">
                      {bPhones.length > 0 && (
                        <div className="space-y-1">
                          {bPhones.map((p: any, pIdx: number) => {
                            const phoneNum = p.phone || p.number || instPhone;
                            const isWa = p.type === "whatsapp" || p.title?.toLowerCase().includes("whatsapp");
                            return (
                              <div key={pIdx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-primary" /> {p.title || "Helpline"}:
                                </span>
                                {isWa ? (
                                  <a
                                    href={`https://wa.me/${phoneNum.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                                  >
                                    {phoneNum} (WA)
                                  </a>
                                ) : (
                                  <a href={`tel:${phoneNum.replace(/[^0-9]/g, "")}`} className="font-bold text-foreground hover:text-primary font-mono">
                                    {phoneNum}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {bEmails.length > 0 && (
                        <div className="space-y-1">
                          {bEmails.map((e: any, eIdx: number) => {
                            const emailStr = e.email || instEmail;
                            return (
                              <div key={eIdx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Mail className="h-3 w-3 text-primary" /> {e.title || "Email"}:
                                </span>
                                <a href={`mailto:${emailStr}`} className="font-bold text-foreground hover:text-primary font-mono truncate">
                                  {emailStr}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 8. CAMPUS NEWS & BLOGS (ONLY IF ADDED BY ADMIN) */}
      {blogs.length > 0 && (
        <section className="py-16 lg:py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                  style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                >
                  <FileText className="h-3.5 w-3.5" /> Updates & News
                </div>
                <h2 className="text-3xl font-extrabold text-foreground">
                  Latest Campus News & Announcements
                </h2>
              </div>
              <Button variant="outline" asChild className="shrink-0 font-bold text-xs">
                <Link href="/blogs">
                  View All News <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b: any) => (
                <Card key={b.id} className="p-6 rounded-2xl border bg-card hover:border-primary/50 transition-all space-y-3">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {b.category || "Campus Update"}
                  </Badge>
                  <h3 className="font-bold text-base text-foreground line-clamp-2">{b.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{b.body}</p>
                  <Button variant="ghost" size="sm" asChild className="text-xs p-0 font-semibold text-primary">
                    <Link href={`/blogs`}>Read More <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9. ADMISSION CALL TO ACTION FOOTER BANNER */}
      <section
        className="py-16 text-white text-center shadow-inner"
        style={{ backgroundColor: brandPrimary }}
      >
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <Badge className="bg-amber-400 text-slate-950 font-extrabold text-xs">
            Admissions Open
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Begin Your Journey at {instName}?
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            Our admissions counselors are available to assist you with course details, batch schedules, and fee concessions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-8 py-6 rounded-xl shadow-xl cursor-pointer"
              asChild
            >
              <a href="#admissions-section">
                Apply for Admission Now
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-bold text-sm px-7 py-6 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/contact">
                Contact Campus Office
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
