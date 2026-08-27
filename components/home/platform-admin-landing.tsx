"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle2,
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  ShieldCheck,
  Building2,
  Award,
  Globe2,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  Server,
  KeyRound,
  FileCheck,
  Library,
  Zap,
  CheckSquare,
  Lock,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  BookMarked,
  UserCheck,
  FileText,
  Star,
  Scale,
  Target,
  LineChart,
  Percent,
  Check,
  ChevronRight,
  Flame,
  MessageSquare,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedCoursesSection } from "@/components/home/featured-courses-section";
import { WhyChooseUsSection } from "@/components/home/why-choose-us-section";
import { CtaSection } from "@/components/home/cta-section";

const PLATFORM_STATS = [
  { value: "50,000+", label: "Verified Courses", icon: BookOpen },
  { value: "10,000+", label: "Partner Institutes", icon: Building2 },
  { value: "4.9 / 5.0", label: "Average Student Rating", icon: Star },
  { value: "1.2M+", label: "Active Students & Parents", icon: TrendingUp },
];

const SEARCH_TABS = [
  { id: "courses", label: "Top Courses", placeholder: "Search courses by name, stream, degree (e.g. B.Tech, NEET, MBA)...", href: "/courses" },
  { id: "institutes", label: "Institutions & Colleges", placeholder: "Search universities, schools, coaching institutes by name or city...", href: "/institutes" },
  { id: "teachers", label: "Expert Teachers", placeholder: "Search verified faculty by subject, specialization, or institute...", href: "/teachers" },
  { id: "practice", label: "Practice & Exams", placeholder: "Search mock tests, practice quizzes, exam series & past papers...", href: "/practice" },
];

const CORE_VALUE_PROPOSITIONS = [
  {
    icon: Building2,
    badge: "Institute Discovery",
    title: "Find & Compare Top Institutions",
    description:
      "Explore thousands of verified universities, colleges, and coaching centers. Compare transparent student ratings, faculty credentials, fee structures, and placement records.",
    color: "from-rose-500/10 to-orange-500/10 text-rose-600 border-rose-200/80",
    href: "/institutes",
    actionText: "Explore Institutions",
  },
  {
    icon: Award,
    badge: "Highest-Rated Courses",
    title: "Top-Rated Academic & Skill Courses",
    description:
      "Access 50,000+ curated degree programs, competitive exam batches, board classes, and skill certifications with reviews, comprehensive syllabi, and transparent pricing.",
    color: "from-amber-500/10 to-yellow-500/10 text-amber-600 border-amber-200/80",
    href: "/courses",
    actionText: "Browse Top Courses",
  },
  {
    icon: UserCheck,
    badge: "Expert Mentors",
    title: "Best Faculty & Subject Mentors",
    description:
      "Learn from verified educators and top professors from premier institutes. Review their qualifications, student ratings, teaching methods, and live batches.",
    color: "from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-200/80",
    href: "/teachers",
    actionText: "Meet Top Teachers",
  },
  {
    icon: Target,
    badge: "Exam Simulation",
    title: "Interactive Practice & Mock Exams",
    description:
      "Take timed mock tests, chapter-wise quizzes, and full-length competitive exams with instant AI answer evaluations, detailed solution steps, and national percentile ranks.",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/80",
    href: "/practice",
    actionText: "Start Free Practice",
  },
  {
    icon: LineChart,
    badge: "Parent & Student 360°",
    title: "Real-Time Student Performance Tracking",
    description:
      "Empowering parents and students with live attendance monitoring, test score breakdowns, weakness diagnosis, grade trends, and direct report cards.",
    color: "from-purple-500/10 to-indigo-500/10 text-purple-600 border-purple-200/80",
    href: "/parent",
    actionText: "Parent Tracking Hub",
  },
  {
    icon: Server,
    badge: "For Institutes",
    title: "All-in-One Institutional ERP & Admissions",
    description:
      "Institutions can list courses on the national marketplace, automate admissions, manage digital classrooms, timetables, and conduct online examinations.",
    color: "from-slate-500/10 to-zinc-500/10 text-slate-700 border-slate-200/80",
    href: "/admin",
    actionText: "Institute Portal",
  },
];

export function PlatformAdminLanding() {
  const [activeSearchTab, setActiveSearchTab] = useState("courses");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Dynamic Platform Settings & Contact Details
  const [contactData, setContactData] = useState<{
    email: string;
    phone: string;
    address: string;
    working_hours: string;
    title?: string;
  }>({
    email: "support@edubird.com",
    phone: "+91 1234567890",
    address: "Orderly Bazar, Varanasi, Uttar Pradesh, India",
    working_hours: "Mon - Sat: 9:00 AM - 7:00 PM",
  });

  // Dynamic Top Partner Institutes & Teachers from Database
  const [partnerInstitutes, setPartnerInstitutes] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [platformBranches, setPlatformBranches] = useState<any[]>([]);

  useEffect(() => {
    // 0. Fetch Platform Branches
    fetch("/api/public/branches")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.branches && Array.isArray(json.branches)) {
          setPlatformBranches(json.branches);
        }
      })
      .catch(() => undefined);
    // 1. Fetch Contact Details from Platform Admin Panel
    fetch("/api/public/company/pages/contact-us")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.metadata) {
          const meta = json.data.metadata;
          setContactData({
            email: meta.email || "support@edubird.com",
            phone: meta.phone || "+91 1234567890",
            address: meta.address || "Orderly Bazar, Varanasi, Uttar Pradesh, India",
            working_hours: meta.working_hours || "Mon - Sat: 9:00 AM - 7:00 PM",
            title: json.data.title,
          });
        }
      })
      .catch(() => undefined);

    // 2. Fetch Partner Institutes for Marketplace Showcase
    fetch("/api/institutions?limit=6")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.institutions) ? json.institutions : [];
        if (rows.length > 0) {
          setPartnerInstitutes(rows);
        }
      })
      .catch(() => undefined);

    // 3. Fetch Real Teachers from Database
    fetch("/api/public/teachers?limit=4")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.teachers) ? json.teachers : Array.isArray(json?.data) ? json.data : [];
        if (rows.length > 0) {
          setTeachers(rows);
        }
      })
      .catch(() => undefined);

    // 4. Fetch Real Blogs from Database
    fetch("/api/public/blogs?limit=3")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.blogs) ? json.blogs : [];
        if (rows.length > 0) {
          setBlogs(rows);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (activeSearchTab === "institutes") {
      router.push(`/institutes?search=${encodeURIComponent(query)}`);
    } else if (activeSearchTab === "teachers") {
      router.push(`/teachers?search=${encodeURIComponent(query)}`);
    } else if (activeSearchTab === "practice") {
      router.push(`/practice?search=${encodeURIComponent(query)}`);
    } else {
      router.push(`/courses?search=${encodeURIComponent(query)}`);
    }
  };

  const currentTabInfo = SEARCH_TABS.find((t) => t.id === activeSearchTab) || SEARCH_TABS[0];

  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* 1. HERO SECTION (MULTI-INTENT DISCOVERY & RATING HUB) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDFD] via-[#FFF9F9] to-white py-12 lg:py-20 border-b border-gray-100">
        {/* Background Decorative Circles */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-rose-200/20 via-amber-200/20 to-orange-200/20 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Top Verified Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-extrabold shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-rose-600" />
              <span>India&apos;s #1 Education Discovery, Rating & Performance Ecosystem</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.15]">
              Find Top Institutions, Highest-Rated Courses &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-600 to-amber-600">
                Expert Faculty
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Compare institutions by verified ratings, enroll in top-rated courses, learn from premier educators, practice mock exams, and track your child&apos;s academic performance in real time.
            </p>

            {/* 4-in-1 Smart Search with Category Tabs */}
            <div className="bg-white p-3 sm:p-4 rounded-3xl shadow-xl border border-gray-200/80 max-w-3xl mx-auto text-left space-y-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {SEARCH_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSearchTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                      activeSearchTab === tab.id
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200/80 text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full flex items-center">
                  <Search className="absolute left-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={currentTabInfo.placeholder}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-gray-900 text-sm font-medium py-3 pl-11 pr-4 rounded-xl border border-gray-200 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm px-7 py-3 rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </button>
              </form>

              {/* Quick Tags under Search */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1">
                <span className="font-semibold text-gray-700">Popular Searches:</span>
                <Link href="/courses?search=NEET" className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium">
                  NEET & Medical
                </Link>
                <Link href="/courses?search=Engineering" className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium">
                  JEE & B.Tech
                </Link>
                <Link href="/institutes" className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">
                  Top Colleges
                </Link>
                <Link href="/teachers" className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">
                  Maths & Science Mentors
                </Link>
                <Link href="/practice" className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">
                  Free Mock Tests
                </Link>
              </div>
            </div>

            {/* Key Statistics Bar */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto border-t border-gray-100">
              {PLATFORM_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-gray-100 shadow-2xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-base sm:text-lg font-black text-gray-900 leading-tight">{stat.value}</div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE VALUE PILLARS (WHAT YOU CAN DO ON EDUBIRD) */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold px-3 py-1 text-xs">
              <Compass className="h-3.5 w-3.5 mr-1" /> Unified Education Ecosystem
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              One Platform for All Your Educational Needs
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Whether you are a student preparing for exams, a parent tracking progress, or an institution managing courses — EduBird has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {CORE_VALUE_PROPOSITIONS.map((prop) => {
              const Icon = prop.icon;
              return (
                <Card
                  key={prop.title}
                  className="p-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:shadow-xl hover:border-rose-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-gray-100 text-gray-700">
                        {prop.badge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                        {prop.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-2">
                        {prop.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <Link
                      href={prop.href}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{prop.actionText}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. COMPARE INSTITUTIONS & COURSES WITH RATINGS (INTERACTIVE PREVIEW) */}
      <section className="py-16 bg-gradient-to-b from-slate-50/70 via-rose-50/20 to-white border-b border-gray-100">
        <div className="container mx-auto px-4 space-y-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 font-bold px-3 py-1 text-xs">
              <Scale className="h-3.5 w-3.5 mr-1" /> Smart Comparison Engine
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Compare Institutions & Courses Side-by-Side
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Make informed decisions with transparent comparison of student reviews, fee structures, faculty strength, mock test quality, and verified placement statistics.
            </p>
          </div>

          {/* Comparison Cards Showcase */}
          <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="grid md:grid-cols-3 gap-6 items-center">
              {/* Feature Highlights Column */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Transparent Decision Making</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">
                  Never Guess Your Education Investment
                </h3>
                <ul className="space-y-2.5 text-xs text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Real verified student & alumni ratings (1 to 5 stars)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Transparent fee breakdowns with scholarship options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Faculty qualifications, mentorship & batch sizes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Integrated mock exam & practice test availability</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm">
                    <Link href="/institutes">
                      Start Comparing Institutes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Sample Institute Comparison Card A */}
              <div className="p-5 rounded-2xl border-2 border-rose-500/20 bg-rose-50/20 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <Badge className="bg-rose-600 text-white text-[10px] font-bold">Top Ranked</Badge>
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>4.9 / 5.0 (850+ reviews)</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-gray-900 text-base">Apex Premier Institute</h4>
                  <p className="text-xs text-gray-500">Autonomous • Engineering & Medical</p>
                </div>

                <div className="space-y-2 text-xs divide-y divide-gray-100">
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Course Fee:</span>
                    <span className="font-bold text-gray-900">₹85,000 / year</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Faculty Rating:</span>
                    <span className="font-bold text-emerald-600">4.9 ★ (PhD Faculty)</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Mock Exams:</span>
                    <span className="font-bold text-gray-900">50+ Series Included</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Parent Tracker:</span>
                    <span className="font-bold text-emerald-600">Live App & SMS</span>
                  </div>
                </div>
              </div>

              {/* Sample Institute Comparison Card B */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] font-bold">Recommended</Badge>
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>4.8 / 5.0 (620+ reviews)</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-gray-900 text-base">National Academy of Science</h4>
                  <p className="text-xs text-gray-500">Affiliated • CBSE & State Board</p>
                </div>

                <div className="space-y-2 text-xs divide-y divide-gray-100">
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Course Fee:</span>
                    <span className="font-bold text-gray-900">₹60,000 / year</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Faculty Rating:</span>
                    <span className="font-bold text-emerald-600">4.8 ★ (Expert Mentors)</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Mock Exams:</span>
                    <span className="font-bold text-gray-900">30+ Series Included</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Parent Tracker:</span>
                    <span className="font-bold text-emerald-600">Weekly Reports</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ACADEMIC CATEGORIES GRID (ALL 9 MODULES) */}
      <CategoriesSection />

      {/* 5. FEATURED & HIGHEST RATED COURSES */}
      <FeaturedCoursesSection />

      {/* 6. TOP VERIFIED PARTNER INSTITUTIONS & UNIVERSITIES */}
      {partnerInstitutes.length > 0 && (
        <section className="py-16 bg-slate-50/50 border-y border-gray-100">
          <div className="container mx-auto px-4 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold mb-2">
                  <Building2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>National Institutional Network</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Top Partner Institutions & Universities
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Accredited schools, colleges, coaching institutes, and universities with student reviews and verified credentials.
                </p>
              </div>
              <Button variant="outline" className="gap-2 shrink-0 border-rose-200 hover:bg-rose-50 hover:text-rose-700" asChild>
                <Link href="/institutes">
                  Explore All Institutes <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partnerInstitutes.slice(0, 6).map((inst: any) => (
                <Card
                  key={inst.id}
                  className="p-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:shadow-xl hover:border-rose-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shrink-0 border border-rose-100 group-hover:scale-105 transition-transform overflow-hidden relative">
                          {inst.logo_url ? (
                            <Image src={inst.logo_url} alt={inst.name || "Institute"} fill className="object-cover" />
                          ) : (
                            <Building2 className="h-6 w-6" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-gray-900 group-hover:text-rose-600 transition-colors text-base truncate">
                            {inst.name || `Institution #${inst.id}`}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                            {inst.location_name || inst.city || "Pan-India Campus"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                        Verified
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {inst.about || "Accredited institution offering state-of-the-art educational programs, experienced faculty, and modern digital classrooms."}
                    </p>

                    {/* Rating Bar */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center text-amber-500 font-extrabold gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>4.8</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 font-medium">100% Verified Reviews</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">
                      {inst.type_name || inst.institution_type || "Higher Education"}
                    </span>
                    <Link
                      href={`/institutes/${inst.slug || inst.id}`}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      View Details & Courses <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. VERIFIED MARKETPLACE EDUCATORS & FACULTY */}
      {teachers.length > 0 && (
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold mb-2">
                  <UserCheck className="h-3.5 w-3.5 text-rose-600" />
                  <span>Marketplace Faculty Directory</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Best Teachers from Top Institutes
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Connect with experienced professors, competitive coaches, and subject specialists with high student ratings.
                </p>
              </div>
              <Button variant="outline" className="gap-2 shrink-0 border-rose-200 hover:bg-rose-50 hover:text-rose-700" asChild>
                <Link href="/teachers">
                  All Faculty <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {teachers.map((t: any) => (
                <Card key={t.id} className="p-5 rounded-2xl border border-gray-200/80 bg-white hover:border-rose-300 hover:shadow-md transition-all space-y-4 text-center flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="mx-auto h-20 w-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl overflow-hidden relative border border-rose-100">
                      {t.avatar_url ? (
                        <Image src={t.avatar_url} alt={t.full_name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <span>{t.full_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 leading-snug">{t.full_name}</h4>
                      <p className="text-xs text-rose-600 font-semibold mt-0.5">{t.designation || "Subject Specialist"}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{t.institution_name || "Partner Institute"}</p>
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xs mt-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>4.9 ★ Rating</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <Link href={`/teachers`} className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1">
                      View Profile & Reviews <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. PRACTICE, EXAMS & STUDENT PERFORMANCE SUITE */}
      <section className="py-16 bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 space-y-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge className="bg-rose-600 text-white font-bold px-3 py-1 text-xs border-0">
              <Zap className="h-3.5 w-3.5 mr-1" /> Practice & Assessment Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Practice Quizzes, Mock Exams & Live Analytics
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Master your syllabus with thousands of curated chapter tests, timed simulations, and AI-driven performance breakdowns.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Feature Card 1 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/50 hover:bg-white/10 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xl">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Daily Practice Quizzes</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Topic-wise questions with instant hint support, detailed step-by-step solutions, and immediate concept reinforcement.
                </p>
              </div>
              <Button asChild size="sm" variant="secondary" className="w-full text-xs font-bold">
                <Link href="/practice">Practice Questions</Link>
              </Button>
            </div>

            {/* Feature Card 2 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-white/10 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Timed Mock Test Series</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Real exam simulation with timer, negative marking, section switching, and nationwide percentile ranking.
                </p>
              </div>
              <Button asChild size="sm" variant="secondary" className="w-full text-xs font-bold">
                <Link href="/exams">Attempt Mock Exams</Link>
              </Button>
            </div>

            {/* Feature Card 3 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Weakness Heatmaps</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Deep AI diagnosis pinpoints exact topics where mistakes happen, with recommended revision notes.
                </p>
              </div>
              <Button asChild size="sm" variant="secondary" className="w-full text-xs font-bold">
                <Link href="/student/dashboard">View My Analytics</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PARENT & GUARDIAN 360° CHILD PERFORMANCE MONITORING */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 space-y-10">
          <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200/80 p-8 sm:p-12">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-rose-700 text-xs font-extrabold border border-rose-200 shadow-2xs">
                  <Users className="h-3.5 w-3.5 text-rose-600" />
                  <span>Dedicated Parent & Guardian Portal</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Track Your Child&apos;s Performance, Attendance & Exam Scores in Real Time
                </h2>

                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  EduBird bridges the gap between parents, students, and institutes. Get instant visibility into your child&apos;s academic journey from any device.
                </p>

                <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-700 font-medium">
                  <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live daily attendance alerts</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Instant exam results & score cards</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Subject-wise weak area diagnosis</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Direct teacher & mentor chat</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md">
                    <Link href="/parent/children">
                      Access Parent Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-rose-300 text-rose-700 hover:bg-white text-xs font-bold">
                    <Link href="/help">How Parent Tracking Works</Link>
                  </Button>
                </div>
              </div>

              {/* Right Illustration Card */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-rose-100 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center text-xs">
                      A
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Aarav Sharma</h4>
                      <p className="text-[10px] text-gray-500">Class 12 - Science (JEE Batch)</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">96% Attendance</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Physics Weekly Test:</span>
                    <span className="font-bold text-gray-900">48 / 50 (Rank #2)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[96%]" />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Chemistry Mock Test:</span>
                    <span className="font-bold text-gray-900">45 / 50 (Rank #5)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[90%]" />
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl text-xs text-rose-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                    AI Mentor Recommendation
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Practice 15 more questions in &quot;Rotational Dynamics&quot; to push Physics score to 100%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. WHY CHOOSE SECTION */}
      <WhyChooseUsSection />

      {/* 11. LIVE PLATFORM ADMIN CONTACT & HELP DESK */}
      <section className="py-16 bg-gradient-to-b from-slate-50/70 via-rose-50/20 to-white border-t border-gray-100">
        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold px-3 py-1 text-xs">
              <Phone className="h-3.5 w-3.5 mr-1" /> Platform Administration & Support
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Get in Touch with EduBird Platform
            </h2>
            <p className="text-sm text-gray-600">
              Direct headquarters contact details, support desks, and institutional onboarding assistance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {/* Phone Support */}
            <Card className="p-6 bg-white border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">National Helpline</h3>
              <p className="text-xs font-bold text-rose-600">{contactData.phone}</p>
              <p className="text-[11px] text-gray-500">Toll-free student & parent guidance</p>
            </Card>

            {/* Email Support */}
            <Card className="p-6 bg-white border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Support Email</h3>
              <p className="text-xs font-bold text-blue-600 truncate">{contactData.email}</p>
              <p className="text-[11px] text-gray-500">24/7 online help & admissions</p>
            </Card>

            {/* Working Hours */}
            <Card className="p-6 bg-white border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Working Hours</h3>
              <p className="text-xs font-bold text-emerald-700">{contactData.working_hours}</p>
              <p className="text-[11px] text-gray-500">IST support hours</p>
            </Card>

            {/* Office Address */}
            <Card className="p-6 bg-white border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Headquarters</h3>
              <p className="text-xs font-medium text-gray-700 line-clamp-2">{contactData.address}</p>
              <p className="text-[11px] text-gray-500">Corporate & Technical Center</p>
            </Card>
          </div>

          {/* Regional Branches Grid */}
          {platformBranches.length > 0 && (
            <div className="pt-8 max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-rose-600" />
                  Our Regional Branches & Offices
                </h3>
                <Link href="/contact" className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
                  View Full Directory <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {platformBranches.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-rose-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-gray-900">{b.branch_name}</h4>
                      <Badge variant="outline" className="text-[10px] font-bold text-rose-600 border-rose-200 bg-rose-50">
                        {b.city}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{b.address}</p>
                    <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 border-t">
                      {b.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-rose-500" /> {b.phone}
                        </span>
                      )}
                      {b.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-blue-500" /> {b.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 12. PLATFORM CTA SECTION */}
      <CtaSection />
    </div>
  );
}
