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
  { value: "100+", label: "Academic Categories", icon: GraduationCap },
  { value: "1.2M+", label: "Learners & Enrollees", icon: TrendingUp },
];

const PLATFORM_PILLARS = [
  {
    icon: Globe2,
    title: "Global Education Marketplace",
    description: "Pan-India course catalog aggregating top universities, schools, coaching institutes, and vocational tracks with transparent pricing and syllabus.",
    badge: "Public Network",
  },
  {
    icon: Server,
    title: "Multi-Tenant Architecture",
    description: "Centralized super-admin control governing thousands of autonomous institute sub-tenants, shared academic databases, and isolated data fences.",
    badge: "Enterprise Core",
  },
  {
    icon: BarChart3,
    title: "Real-Time Platform Intelligence",
    description: "Nationwide analytics on student inquiries, course demand, regional admissions, payment settlements, and learner retention rates.",
    badge: "Super Admin",
  },
  {
    icon: KeyRound,
    title: "Granular Role Governance",
    description: "Unified RBAC engine spanning Platform Admins, Institute Owners, Teachers, Accountants, Students, Guardians, and Drivers.",
    badge: "Security & IAM",
  },
  {
    icon: Zap,
    title: "AI-Powered Discovery Engine",
    description: "Intelligent course matching, personalized career pathways, and algorithmic lead distribution to verified institutional partners.",
    badge: "AI Engine",
  },
  {
    icon: ShieldCheck,
    title: "APAAR & Compliance Ready",
    description: "Automated verification protocols conforming with National Education Policy (NEP 2020), NAAC benchmarks, and digital student IDs.",
    badge: "Compliance",
  },
];

export function PlatformAdminLanding() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Dynamic Platform Settings & Contact Details from Platform Admin Panel
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

  // Dynamic Top Partner Institutes from Marketplace
  const [partnerInstitutes, setPartnerInstitutes] = useState<any[]>([]);

  useEffect(() => {
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
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* 1. HERO SECTION (PLATFORM EDITION) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDFD] via-[#FFF8F8]/60 to-white py-12 lg:py-20 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Verified Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold shadow-2xs">
                <Globe2 className="h-3.5 w-3.5 text-rose-600 animate-spin-slow" />
                <span>EduBird Platform — National Education Marketplace</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.1]">
                India&apos;s Premier Unified{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-600 to-amber-600">
                  Education Ecosystem
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed font-normal">
                Connecting students, top educational institutions, and expert educators across India. 
                Discover verified courses, compare campus offerings, and manage national-scale educational delivery.
              </p>

              {/* Hero Search Box */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl shadow-xl border border-gray-200/80 max-w-2xl"
              >
                <div className="relative flex-1 w-full flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 50,000+ courses, institutes, tests, or skills..."
                    className="w-full bg-transparent text-gray-900 text-sm font-medium py-3 pl-11 pr-4 outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm px-7 py-3 rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Search Network</span>
                </button>
              </form>

              {/* Quick Link Pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1">
                <span className="font-semibold text-gray-700">Quick Explore:</span>
                <Link href="/courses" className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 font-medium transition-colors">
                  Top Courses
                </Link>
                <Link href="/institutes" className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 font-medium transition-colors">
                  Universities & Colleges
                </Link>
                <Link href="/practice" className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 font-medium transition-colors">
                  Mock Tests & Quizzes
                </Link>
                <Link href="/notes" className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 font-medium transition-colors">
                  Lecture Notes
                </Link>
              </div>

              {/* 4 Stat Badges */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl border-t border-gray-100">
                {PLATFORM_STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex items-center gap-3 p-2 rounded-xl bg-white/50 border border-gray-100">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-gray-900 leading-none">
                          {stat.value}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium mt-1">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Hero Image / Platform Preview Composition */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none space-y-4">
                {/* Background ambient glow */}
                <div className="absolute -top-4 -bottom-4 -left-4 -right-4 bg-gradient-to-r from-rose-300/30 via-orange-200/30 to-amber-300/20 rounded-3xl blur-2xl -z-10" />

                <div className="relative rounded-3xl overflow-hidden border border-gray-200/80 bg-white shadow-2xl">
                  <div className="relative h-[300px] sm:h-[360px] w-full">
                    <Image
                      src="/images/hero-books.jpg"
                      alt="EduBird Platform Network"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[11px] font-extrabold w-fit mb-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Platform Edition
                      </div>
                      <h3 className="font-extrabold text-xl leading-tight">
                        Unified Academic Discovery & Management
                      </h3>
                      <p className="text-xs text-white/80 mt-1">
                        Empowering 10,000+ educational campuses with centralized multi-tenant architecture.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Quick Action Card */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Are you a Platform Administrator?</p>
                      <p className="text-[11px] text-gray-500">Access the master analytics & control console.</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0">
                    <Link href="/admin">
                      Admin Console <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACADEMIC CATEGORIES GRID (ALL 9 MODULES) */}
      <CategoriesSection />

      {/* 3. FEATURED MARKETPLACE COURSES */}
      <FeaturedCoursesSection />

      {/* 4. TOP VERIFIED PARTNER INSTITUTIONS & UNIVERSITIES */}
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
                  Accredited schools, colleges, coaching institutes, and universities powered by EduBird ERP.
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
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">
                      {inst.type_name || inst.institution_type || "Higher Education"}
                    </span>
                    <Link
                      href={`/?institution_id=${inst.id}&view=institution`}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      View Campus ERP <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. PLATFORM ECOSYSTEM PILLARS */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold px-3 py-1 text-xs">
              <Layers className="h-3.5 w-3.5 mr-1" /> Platform Architecture
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              A Complete Ecosystem Built for Educational Scale
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Designed from the ground up to orchestrate cross-institution learning, lead generation, governance, and centralized academic compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={pillar.title}
                  className="p-6 bg-white border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-rose-500/30 transition-all rounded-2xl flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-gray-100 text-gray-700">
                        {pillar.badge}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4 flex items-center text-xs font-bold text-rose-600">
                    <span>Explore Platform Capabilities</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE SECTION */}
      <WhyChooseUsSection />

      {/* 7. LIVE PLATFORM ADMIN CONTACT & HELP DESK (DIRECT FROM ADMIN PANEL) */}
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
        </div>
      </section>

      {/* 8. PLATFORM CTA SECTION */}
      <CtaSection />
    </div>
  );
}
