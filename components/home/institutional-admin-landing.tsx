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
  Download,
  School,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Compass,
  Laptop,
  Briefcase,
  Layers,
  Send,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Quote,
  Target,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  const [loading, setLoading] = useState(true);

  // Quick Enquiry Form state
  const [enqName, setEnqName] = useState("");
  const [enqEmail, setEnqEmail] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqCourse, setEnqCourse] = useState("B.Tech Computer Science & AI");
  const [enqMessage, setEnqMessage] = useState("");
  const [submittingEnq, setSubmittingEnq] = useState(false);

  // Selected Category Filter for Courses
  const [selectedCategory, setSelectedCategory] = useState("all");

  const resolvedInstId = activeInstitutionId || user?.memberships?.[0]?.institution_id || defaultEnvInstitutionId;

  useEffect(() => {
    async function loadInstituteHome() {
      setLoading(true);
      try {
        const [instRes, progRes, teachRes] = await Promise.all([
          resolvedInstId
            ? fetch(`/api/public/institution/info?institutionId=${resolvedInstId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/public/courses?limit=6${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/public/teachers?limit=6${resolvedInstId ? `&institutionId=${resolvedInstId}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (instRes?.data) setInstitutionData(instRes.data);
        if (progRes?.data && Array.isArray(progRes.data)) setFeaturedPrograms(progRes.data);
        if (teachRes?.data && Array.isArray(teachRes.data)) setTeachers(teachRes.data);
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
          preferred_program: enqCourse,
          source: "Institutional Landing Admission Desk",
          notes: enqMessage.trim() || `Admissions enquiry for ${enqCourse}`,
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

  // Base Institution Properties
  const instName = institutionData?.name || activeInstitution?.name || "Apex Institute of Technology & Management";
  const instLogo = institutionData?.logo_url || (activeInstitution as any)?.logo_url || (activeInstitution as any)?.image_url;
  const instAbout = institutionData?.about || "A premier accredited institution committed to academic excellence, state-of-the-art research laboratories, innovative teaching pedagogies, and exceptional corporate career placements.";
  const instMission = institutionData?.mission || "To provide transformative education through rigorous scholarship, ethical values, and cutting-edge practical research, preparing students to lead globally.";
  const instVision = institutionData?.vision || "To be recognized globally as a center of educational and technological excellence, nurturing innovation and producing industry-ready graduates.";
  const instGoal = institutionData?.goal || "Achieve 100% employability, establish international university partnerships, and foster an environment of continuous learning and entrepreneurship.";
  const instLocation = institutionData?.location_name || institutionData?.branches?.[0]?.city || "Varanasi, Uttar Pradesh, India";
  const instPhone = institutionData?.phone || institutionData?.branches?.[0]?.phones?.[0]?.phone || "+91 9876543210";
  const instEmail = institutionData?.email || institutionData?.branches?.[0]?.emails?.[0]?.email || "admissions@apex-institute.edu.in";
  const establishedYear = institutionData?.established_year || "2008";

  // Founder Information
  const founderName = institutionData?.founder_name || "Dr. Rajeshwar Sharma";
  const founderTitle = institutionData?.founder_title || "Founder & Chairman";
  const founderImage = institutionData?.founder_image_url || null;
  const founderAbout = institutionData?.founder_about || "Education is not merely about accumulating knowledge—it is the igniting of a spark that empowers an individual to transform society. When we established this institution, our single-minded vision was to build a modern temple of learning where every student, regardless of background, receives the highest standard of academic excellence, industry mentorship, and ethical grounding to excel on the global stage.";

  // Branches list
  const branches: any[] = Array.isArray(institutionData?.branches) && institutionData.branches.length > 0
    ? institutionData.branches
    : [
        {
          id: "b1",
          branch_name: "Main Campus & Administrative Block",
          address: "Campus Road, Knowledge Park, Orderly Bazar",
          city: "Varanasi",
          state: "Uttar Pradesh",
          pincode: "221002",
          working_hours: "Monday - Saturday: 8:30 AM - 5:30 PM IST",
          phones: [{ title: "Admissions Helpline", phone: "+91 9876543210", type: "phone" }],
          emails: [{ title: "Central Admissions", email: "admissions@apex-institute.edu.in" }],
          is_primary: true,
        },
        {
          id: "b2",
          branch_name: "City Information & Counselling Center",
          address: "Civil Lines, Near University Crossing",
          city: "Prayagraj",
          state: "Uttar Pradesh",
          pincode: "211001",
          working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM IST",
          phones: [{ title: "Regional Desk", phone: "+91 9876543211", type: "whatsapp" }],
          emails: [{ title: "Regional Office", email: "prayagraj.desk@apex-institute.edu.in" }],
          is_primary: false,
        },
      ];

  // Dynamic Theme Color (Adapted from Institution Logo / Custom Branding)
  // Default is prestigious Academic Maroon / Crimson (#800000)
  const brandPrimary = institutionData?.theme_color || "#800000";
  const brandPrimaryLight = `${brandPrimary}15`;

  // Fallback demo programs if none fetched from DB
  const displayPrograms = featuredPrograms.length > 0 ? featuredPrograms : [
    {
      id: 1,
      name: "B.Tech in Computer Science & Artificial Intelligence",
      duration: "4 Years (8 Semesters)",
      degree_level: "Undergraduate (UG)",
      annual_fee: "1,45,000",
      seats: 120,
      badge: "Highest Placements",
      category: "engineering",
    },
    {
      id: 2,
      name: "Master of Business Administration (MBA - Dual Spec)",
      duration: "2 Years (4 Semesters)",
      degree_level: "Postgraduate (PG)",
      annual_fee: "1,85,000",
      seats: 60,
      badge: "Top B-School",
      category: "management",
    },
    {
      id: 3,
      name: "B.Tech in Electronics & Robotics Engineering",
      duration: "4 Years (8 Semesters)",
      degree_level: "Undergraduate (UG)",
      annual_fee: "1,35,000",
      seats: 90,
      badge: "Industry 4.0 Ready",
      category: "engineering",
    },
    {
      id: 4,
      name: "JEE & NEET Comprehensive Coaching Batch (Target 2027)",
      duration: "2 Years (Integrated)",
      degree_level: "Competitive Prep",
      annual_fee: "85,000",
      seats: 150,
      badge: "Top 100 AIR Track",
      category: "coaching",
    },
    {
      id: 5,
      name: "Bachelor of Computer Applications (BCA - Cloud & Cyber)",
      duration: "3 Years (6 Semesters)",
      degree_level: "Undergraduate (UG)",
      annual_fee: "95,000",
      seats: 80,
      badge: "Hands-on Labs",
      category: "technology",
    },
    {
      id: 6,
      name: "Diploma in Mechanical & Automation Engineering",
      duration: "3 Years (6 Semesters)",
      degree_level: "Polytechnic / Diploma",
      annual_fee: "65,000",
      seats: 60,
      badge: "Skill-Based",
      category: "engineering",
    },
  ];

  // Fallback demo teachers if none fetched
  const displayTeachers = teachers.length > 0 ? teachers : [
    {
      id: 1,
      full_name: "Dr. Arvind K. Mishra",
      designation: "Professor & Head of Computer Science",
      qualification: "Ph.D. (IIT Roorkee), M.Tech (AI & ML)",
      experience_years: 18,
      subjects: ["Artificial Intelligence", "Deep Learning", "Algorithms"],
      avatar_url: null,
    },
    {
      id: 2,
      full_name: "Dr. Sunita Deshmukh",
      designation: "Dean of Management Studies",
      qualification: "Ph.D. (IIM Ahmedabad), MBA (Finance)",
      experience_years: 15,
      subjects: ["Corporate Finance", "Strategic Management"],
      avatar_url: null,
    },
    {
      id: 3,
      full_name: "Prof. Vikramaditya Sen",
      designation: "Lead JEE & Physics Faculty",
      qualification: "M.Sc. Physics (Gold Medalist, BHU)",
      experience_years: 14,
      subjects: ["Advanced Mechanics", "Electromagnetism"],
      avatar_url: null,
    },
    {
      id: 4,
      full_name: "Dr. Rituja Verma",
      designation: "Associate Professor, Biotechnology",
      qualification: "Ph.D. (IISc Bangalore), Post-Doc (USA)",
      experience_years: 11,
      subjects: ["Genetic Engineering", "Bioinformatics"],
      avatar_url: null,
    },
  ];

  const CAMPUS_STATS = [
    { value: "50+", label: "Academic Programs", sub: "UG, PG & Diploma", icon: GraduationCap },
    { value: "96.4%", label: "Placement Success", sub: "₹45 LPA Top Package", icon: Trophy },
    { value: "120+", label: "Faculty Mentors", sub: "Ph.D. & Industry Experts", icon: Users },
    { value: "25+ Acre", label: "Green Campus", sub: "Smart Wi-Fi & AC Hostels", icon: Building2 },
    { value: "35,000+", label: "Library Resources", sub: "Books & IEEE Journals", icon: BookOpen },
    { value: "250+", label: "Recruiting Partners", sub: "Global Fortune 500", icon: Briefcase },
  ];

  const RECRUITERS = [
    "Google", "Microsoft", "Amazon", "Tata Consultancy Services", "Infosys", "Wipro", "Deloitte", "Accenture", "Larsen & Toubro", "HDFC Bank", "ICICI Bank", "Tech Mahindra"
  ];

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
              Campus Alerts
            </Badge>
            <div className="truncate text-rose-100 flex items-center gap-3 animate-pulse">
              <span>📢 Admissions 2026-27 Open</span>
              <span>•</span>
              <span>🏆 96.4% Placements (Highest CTC: ₹45 LPA)</span>
              <span>•</span>
              <span>🎓 Merit Scholarships Available (Up to 100% Fee Waiver)</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/90 shrink-0">
            <a href={`tel:${instPhone.replace(/[^0-9]/g, "")}`} className="hover:underline flex items-center gap-1">
              <Phone className="h-3 w-3" /> {instPhone}
            </a>
            <span className="hidden sm:inline">|</span>
            <Link href="/contact" className="hover:underline hidden sm:inline">
              Campus Helplines
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PRESTIGIOUS HERO SECTION (DYNAMIC LOGO & BRAND THEME INTEGRATION) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-16 lg:py-24 border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        <div
          className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: brandPrimary }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Column: Institution Profile & Key Actions */}
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
                  <span>Est. {establishedYear} • NAAC Grade A+ Accredited • AICTE Approved</span>
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
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                {instAbout}
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  size="lg"
                  className="text-white font-extrabold text-sm px-7 py-6 rounded-xl shadow-lg cursor-pointer"
                  style={{ backgroundColor: brandPrimary }}
                  asChild
                >
                  <a href="#admissions-section">
                    <Sparkles className="h-4 w-4 mr-2" /> Apply for Admission 2026
                  </a>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 font-bold text-sm px-6 py-6 rounded-xl backdrop-blur-md cursor-pointer"
                  asChild
                >
                  <a href="#about-section">
                    <School className="h-4 w-4 mr-2 text-amber-300" /> About Us
                  </a>
                </Button>

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

                <Button
                  size="lg"
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold text-xs px-4"
                  asChild
                >
                  <a href="#branches-section">
                    <MapPin className="h-4 w-4 mr-1.5 text-primary" /> Campus Locations
                  </a>
                </Button>
              </div>

              {/* Key Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>100% Placement Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Smart Wi-Fi Campus</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Merit Scholarships</span>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Admission Guidance & Enquiry Box */}
            <div id="admissions-section" className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="rounded-3xl border border-white/15 bg-slate-900/90 shadow-2xl p-6 sm:p-7 backdrop-blur-xl space-y-5">
                  <div className="border-b border-white/10 pb-3 space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <GraduationCap className="h-4 w-4" /> Admission Desk 2026-27
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
                        <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                        <Input
                          type="email"
                          required
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

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Program / Stream of Interest</label>
                      <select
                        value={enqCourse}
                        onChange={(e) => setEnqCourse(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="B.Tech Computer Science & AI">B.Tech Computer Science & AI</option>
                        <option value="B.Tech Electronics & Robotics">B.Tech Electronics & Robotics</option>
                        <option value="MBA - Dual Specialization">MBA - Dual Specialization</option>
                        <option value="BCA - Cloud & Cybersecurity">BCA - Cloud & Cybersecurity</option>
                        <option value="JEE / NEET Integrated Coaching">JEE / NEET Integrated Coaching</option>
                        <option value="Diploma in Engineering">Diploma in Engineering</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Questions or Query (Optional)</label>
                      <Textarea
                        rows={2}
                        placeholder="Inquire about hostel availability, scholarship percentage..."
                        value={enqMessage}
                        onChange={(e) => setEnqMessage(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingEnq}
                      className="w-full text-white font-bold h-10 text-xs shadow-md"
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

      {/* 3. KEY STATS COUNTERS */}
      <section className="py-10 bg-card border-b border-border shadow-xs">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {CAMPUS_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center space-y-1 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div
                    className="inline-flex p-2 rounded-xl mb-1"
                    style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-xs font-bold text-foreground leading-snug">{stat.label}</div>
                  <div className="text-[11px] text-muted-foreground">{stat.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ABOUT FOUNDER / CHAIRMAN VISIONARY MESSAGE SECTION */}
      <section id="about-section" className="py-16 lg:py-20 bg-muted/20 border-b border-border scroll-mt-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-10 items-center bg-card rounded-3xl p-8 lg:p-12 border border-border shadow-md">
            {/* Founder Portrait / Visual */}
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
                      {founderName.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <p className="font-bold text-lg">{founderName}</p>
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

            {/* Founder Message / Vision */}
            <div className="lg:col-span-8 space-y-5">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
              >
                <Quote className="h-3.5 w-3.5" />
                <span>Message from the Founder & Leadership</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-snug">
                &ldquo;Building a Legacy of Knowledge, Integrity, and Global Impact&rdquo;
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic border-l-4 pl-4" style={{ borderColor: brandPrimary }}>
                &ldquo;{founderAbout}&rdquo;
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Target className="h-4 w-4 text-primary" /> Educational Philosophy
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Focus on experiential learning, character building, and technological mastery to prepare leaders for the 21st century.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Trophy className="h-4 w-4 text-amber-500" /> Student First Commitment
                  </div>
                  <p className="text-xs text-muted-foreground">
                    State-of-the-art campus amenities, accessible merit scholarships, and 100% placement mentorship for every graduate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ABOUT INSTITUTION: MISSION, VISION & GOALS */}
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
              Our Vision, Mission & Institutional Goals
            </h2>
            <p className="text-sm text-muted-foreground">
              Committed to holistic academic development, research excellence, and sustainable social impact.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Vision Card */}
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

            {/* Mission Card */}
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

            {/* Goal Card */}
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
          </div>
        </div>
      </section>

      {/* 6. COURSES & ACADEMIC PROGRAMS SHOWCASE */}
      <section id="courses-section" className="py-16 lg:py-20 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-4 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
            <div>
              <div
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
              >
                <BookOpen className="h-3.5 w-3.5" /> Academic Offerings
              </div>
              <h2 className="text-3xl font-extrabold text-foreground">
                Featured Degrees & Professional Programs
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Industry-aligned syllabus, hands-on lab projects, and dedicated placement assistance.
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
            {displayPrograms.map((course: any, idx: number) => {
              const courseTitle = course.title || course.name || `Program ${idx + 1}`;
              const courseDuration = course.duration || "4 Years Full-Time";
              const courseLevel = course.degree_level || course.level || "Undergraduate";
              const courseFee = course.annual_fee || course.fee || "1,25,000";
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
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {course.description || "Comprehensive academic syllabus focusing on practical workshops, internships, and research."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-muted/40 border border-border/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duration</span>
                        <span className="font-semibold text-foreground">{courseDuration}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Annual Fee</span>
                        <span className="font-semibold text-foreground">₹{courseFee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-border/40 mt-2 flex items-center justify-between gap-2 bg-muted/10">
                    <Button variant="ghost" size="sm" asChild className="text-xs font-semibold p-0">
                      <Link href={`/courses/${course.id || 1}`}>
                        Syllabus & Info <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="font-bold text-xs h-8 text-white"
                      style={{ backgroundColor: brandPrimary }}
                      asChild
                    >
                      <Link href="/contact">Apply Now</Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. TEACHERS & FACULTY MENTORS SECTION */}
      <section className="py-16 lg:py-20 bg-background border-b border-border">
        <div className="container mx-auto px-4 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
            <div>
              <div
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2"
                style={{ backgroundColor: brandPrimaryLight, color: brandPrimary }}
              >
                <Users className="h-3.5 w-3.5" /> Eminent Faculty
              </div>
              <h2 className="text-3xl font-extrabold text-foreground">
                Learn from PhD Scholars & Industry Mentors
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Distinguished professors with decades of research, patents, and top tier corporate consulting experience.
              </p>
            </div>

            <Button variant="outline" asChild className="shrink-0 font-bold text-xs">
              <Link href="/teachers">
                All Faculty Members <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayTeachers.map((teacher: any, idx: number) => {
              const name = teacher.full_name || teacher.name || `Faculty ${idx + 1}`;
              const desig = teacher.designation || "Senior Faculty Member";
              const qual = teacher.qualification || "Ph.D. / M.Tech";
              const exp = teacher.experience_years ? `${teacher.experience_years}+ Yrs Exp` : "10+ Yrs Exp";
              const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : ["Core Engineering", "Applied Research"];

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
                      <p className="text-[11px] text-muted-foreground mt-1">{qual}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {subjects.slice(0, 2).map((sub: string, sIdx: number) => (
                        <Badge key={sIdx} variant="secondary" className="text-[10px] font-medium">
                          {sub}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground block">{exp}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. BRANCHES & CAMPUS LOCATIONS SECTION */}
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
              Regional Campus Branches & Admissions Centers
            </h2>
            <p className="text-sm text-muted-foreground">
              Visit our state-of-the-art campus locations and dedicated regional admission desks.
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
                        <p className="text-xs text-muted-foreground">{b.city ? `${b.city}, ${b.state || "India"}` : "Regional Campus"}</p>
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

      {/* 9. TOP CORPORATE RECRUITERS STRIP */}
      <section className="py-14 bg-background border-b border-border">
        <div className="container mx-auto px-4 space-y-6">
          <div className="text-center space-y-1">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs">
              Campus Placement Partners
            </Badge>
            <h3 className="text-2xl font-bold text-foreground">Our Graduates Work at Fortune 500 Leaders</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {RECRUITERS.map((comp) => (
              <div
                key={comp}
                className="p-3.5 rounded-xl border bg-card text-center font-bold text-xs text-foreground/80 hover:text-primary transition-all flex items-center justify-center min-h-[56px] shadow-xs"
              >
                {comp}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. ADMISSION CALL TO ACTION FOOTER BANNER */}
      <section
        className="py-16 text-white text-center shadow-inner"
        style={{ backgroundColor: brandPrimary }}
      >
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <Badge className="bg-amber-400 text-slate-950 font-extrabold text-xs">
            Academic Session 2026-2027
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Begin Your Educational Journey at {instName}?
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            Our admissions office is ready to assist you with stream selection, eligibility verification, scholarship criteria, and campus hostel tours.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-8 py-6 rounded-xl shadow-xl"
              asChild
            >
              <a href="#admissions-section">
                Apply for Admission Now
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-bold text-sm px-7 py-6 rounded-xl"
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
