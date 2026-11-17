"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Target,
  Compass,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Building2,
  User,
  Heart,
  TrendingUp,
  Lightbulb,
  Globe2,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type MissionVisionPageViewProps = {
  initialProfile?: any;
  companyPage?: any;
};

export function MissionVisionPageView({ initialProfile, companyPage }: MissionVisionPageViewProps) {
  const { activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const [profile, setProfile] = useState<any>(initialProfile);

  useEffect(() => {
    const instId = initialProfile?.id || defaultEnvInstitutionId;
    const url = instId
      ? `/api/public/institution/info?institutionId=${instId}`
      : "/api/public/institution/info";

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProfile(json.data);
        }
      })
      .catch(() => undefined);
  }, [defaultEnvInstitutionId, initialProfile]);

  const name = profile?.name || (defaultEnvInstitutionId ? "Institution" : companyPage?.title || "EduBird");
  const typeLabel = [profile?.type_name, profile?.subtype_name].filter(Boolean).join(" / ") || profile?.business_type || "Organization & Enterprise";
  const heroImage = profile?.banner_url || profile?.logo_url;

  const missionText =
    profile?.mission?.trim() ||
    companyPage?.mission?.trim() ||
    "To deliver accessible, high-impact solutions through expert guidance, state-of-the-art practices, and unwavering commitment to quality and customer success.";

  const visionText =
    profile?.vision?.trim() ||
    companyPage?.vision?.trim() ||
    "To be a benchmark of excellence, trusted leadership, and sustainable community impact, creating enduring value for all stakeholders.";

  const goalText =
    profile?.goal?.trim() ||
    companyPage?.goal?.trim() ||
    "Academic Excellence: Provide high-quality education through effective teaching and modern learning practices.\nSkill Development: Develop practical, technical, communication, and professional skills that improve career opportunities.\nStudent Success: Support every individual in achieving their academic, career, and personal goals.\nIndustry Readiness: Prepare learners with relevant knowledge and practical exposure to meet current industry demands.\nInnovation & Technology: Encourage modern technology and innovative approaches in learning.\nInclusive Learning: Create a supportive environment where individuals from diverse backgrounds can learn and grow.";

  // Parse structured goals if multi-line
  const parsedGoals = goalText
    .split("\n")
    .map((g: string) => g.trim())
    .filter(Boolean)
    .map((goalLine: string, idx: number) => {
      const colonIdx = goalLine.indexOf(":");
      const title = colonIdx > -1 ? goalLine.slice(0, colonIdx).trim() : `Goal ${idx + 1}`;
      const desc = colonIdx > -1 ? goalLine.slice(colonIdx + 1).trim() : goalLine;
      return { title, desc };
    });

  const coreValues = [
    {
      title: "Integrity & Transparency",
      description: "Upholding uncompromising ethical standards, honest practices, and clear communication in everything we do.",
      icon: ShieldCheck,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    },
    {
      title: "Pursuit of Excellence",
      description: "Constantly pushing boundaries and benchmark standards to achieve superior quality, depth, and satisfaction.",
      icon: Award,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    },
    {
      title: "Continuous Innovation",
      description: "Embracing emerging methodologies, smart technologies, and modern frameworks to solve real-world problems.",
      icon: Lightbulb,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    },
    {
      title: "Community & Impact",
      description: "Dedicated to social empowerment, inclusive growth, and shaping responsible future leaders and professionals.",
      icon: Heart,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* ================= 1. HERO HEADER ================= */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-primary/5 to-background py-14 lg:py-20">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Mission, Vision & Goal</span>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              <span>Core Philosophy & Strategic Compass</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Mission, Vision & Strategic Goals
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Explore the fundamental principles, long-term aspirations, and strategic benchmarks that drive <strong className="text-foreground">{name}</strong> forward every single day.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Badge variant="outline" className="border-primary/30 bg-card text-foreground font-medium py-1 px-3">
                <Building2 className="size-3.5 mr-1.5 text-primary" /> {name}
              </Badge>
              <Badge variant="outline" className="border-border bg-card text-muted-foreground font-medium py-1 px-3">
                {typeLabel}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. TRIPLE FOCUS SUMMARY TILES ================= */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href="#mission"
            className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-blue-200 dark:border-blue-900/40 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="size-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Target className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Purpose</p>
              <h3 className="text-base font-extrabold text-foreground">Our Mission</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">What we do every day & why</p>
            </div>
          </a>

          <a
            href="#vision"
            className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-purple-200 dark:border-purple-900/40 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="size-12 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Compass className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Future Outlook</p>
              <h3 className="text-base font-extrabold text-foreground">Our Vision</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Where we are headed long-term</p>
            </div>
          </a>

          <a
            href="#goals"
            className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-emerald-200 dark:border-emerald-900/40 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="size-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Action Plan</p>
              <h3 className="text-base font-extrabold text-foreground">Strategic Goals</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Measurable milestones & focus</p>
            </div>
          </a>
        </div>
      </section>

      {/* ================= 3. DETAILED MISSION & VISION SECTIONS ================= */}
      <section className="container mx-auto px-4 py-16 space-y-12">
        {/* MISSION CARD */}
        <div id="mission" className="scroll-mt-24 rounded-3xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 p-8 sm:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                <Target className="size-3.5" />
                <span>Our Core Purpose</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                Our Mission Statement
              </h2>

              <blockquote className="border-l-4 border-blue-600 pl-4 py-1 italic text-base sm:text-lg text-foreground font-medium leading-relaxed bg-blue-500/5 rounded-r-xl">
                &ldquo;{missionText}&rdquo;
              </blockquote>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                At {name}, our mission is not just a statement—it is the operational blueprint behind every curriculum, service offering, customer engagement, and institutional standard we uphold. We measure our success through the tangible achievements and satisfaction of the people we serve.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Accessible Quality:</strong> Premium guidance made reachable for every deserving individual.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Continuous Support:</strong> Dedicated mentorship and advisory throughout the entire journey.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Ethical Standards:</strong> Uncompromised integrity, transparency, and accountability.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Practical Outcomes:</strong> Focus on real-world skills and demonstrable results.</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-blue-200/60 dark:border-blue-900/40 shadow-md text-center space-y-4">
              <div className="size-16 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md">
                <Target className="size-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-foreground">Mission in Action</h4>
                <p className="text-xs text-muted-foreground mt-1">Driving excellence with continuous improvement</p>
              </div>
              <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Student / Client Commitment</span>
                  <span className="font-bold text-foreground">100%</span>
                </div>
                <div className="flex justify-between">
                  <span>Curriculum & Service Reviews</span>
                  <span className="font-bold text-foreground">Regular & Continuous</span>
                </div>
                <div className="flex justify-between">
                  <span>Quality Benchmark</span>
                  <span className="font-bold text-emerald-600">Certified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VISION CARD */}
        <div id="vision" className="scroll-mt-24 rounded-3xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/70 via-card to-card dark:from-purple-950/20 p-8 sm:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-48 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-xs font-bold uppercase tracking-wider">
                <Compass className="size-3.5" />
                <span>Our Long-Term Horizon</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                Our Vision for Tomorrow
              </h2>

              <blockquote className="border-l-4 border-purple-600 pl-4 py-1 italic text-base sm:text-lg text-foreground font-medium leading-relaxed bg-purple-500/5 rounded-r-xl">
                &ldquo;{visionText}&rdquo;
              </blockquote>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                We envision a future where our learners and clients emerge as confident leaders, pioneering problem-solvers, and impactful contributors across diverse global sectors. Our vision is built on the belief that purposeful education and expert training have the power to transform societies.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Global Relevance:</strong> Knowledge and practices calibrated to contemporary demands.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Leadership Cultivation:</strong> Fostering strategic thinking and problem-solving.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Sustainable Impact:</strong> Long-term institutional value that benefits future generations.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <CheckCircle2 className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Inclusive Growth:</strong> Empowering talent across all socioeconomic spectrums.</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-purple-200/60 dark:border-purple-900/40 shadow-md text-center space-y-4">
              <div className="size-16 rounded-2xl bg-purple-600 text-white mx-auto flex items-center justify-center shadow-md">
                <Compass className="size-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-foreground">Future Roadmap</h4>
                <p className="text-xs text-muted-foreground mt-1">Expanding horizons with technology & talent</p>
              </div>
              <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Innovation Index</span>
                  <span className="font-bold text-foreground">Pioneering</span>
                </div>
                <div className="flex justify-between">
                  <span>Community Reach</span>
                  <span className="font-bold text-foreground">Expanding</span>
                </div>
                <div className="flex justify-between">
                  <span>Institutional Legacy</span>
                  <span className="font-bold text-purple-600">Enduring</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. COMPREHENSIVE STRATEGIC GOALS ================= */}
      <section id="goals" className="border-t border-border bg-gradient-to-b from-card via-muted/20 to-background py-16 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <Award className="size-3 mr-1 inline" /> Strategic Roadmaps
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Our Strategic Goals & Milestones
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Specific focus areas guiding our daily operations, resource investment, and continuous quality advancement.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {parsedGoals.map((goal, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs">
                      0{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 font-semibold">
                      Priority Focus
                    </Badge>
                  </div>

                  <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                    {goal.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {goal.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" /> Active Strategy
                  </span>
                  <span>{name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 5. CORE VALUE PILLARS ================= */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px]">
            Values & Ethics
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Our Foundational Core Values
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            The values that anchor our character, shape our community culture, and define our identity.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {coreValues.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all text-center space-y-3"
              >
                <div className={`size-14 rounded-2xl mx-auto flex items-center justify-center border shadow-xs ${val.color}`}>
                  <Icon className="size-7" />
                </div>
                <h4 className="font-bold text-base text-foreground">{val.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{val.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 6. INTERLINKING TO OTHER ABOUT PAGES ================= */}
      <section className="border-t border-border bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h3 className="text-2xl font-extrabold text-foreground">Explore More About {name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Continue discovering our history, campus overview, and visionary leadership.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {/* Overview Card */}
            <Link
              href="/about"
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 shadow-xs hover:shadow-lg transition-all group flex items-start gap-4"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Building2 className="size-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    Organization Overview
                  </h4>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discover our history, establishment, campus infrastructure, and certifications.
                </p>
              </div>
            </Link>

            {/* Founder Card */}
            <Link
              href="/about/founder"
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 shadow-xs hover:shadow-lg transition-all group flex items-start gap-4"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <User className="size-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    About Founder & Leadership
                  </h4>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Learn about our founding story, visionary leadership board, and executive philosophy.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
