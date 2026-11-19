"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MessageCircle,
  Quote,
  Sparkles,
  Award,
  Target,
  Compass,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type FounderPageViewProps = {
  initialProfile?: any;
  companyPage?: any;
};

export function FounderPageView({ initialProfile, companyPage }: FounderPageViewProps) {
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

  const founderName = profile?.founder_name?.trim() || "Leadership & Visionary Board";
  const founderTitle = profile?.founder_title?.trim() || "Founder & Managing Director";
  const founderImage = profile?.founder_image_url || "/uploads/media/deepak_yadav_founder.jpg";

  const founderAbout =
    profile?.founder_about?.trim() ||
    companyPage?.content ||
    `Guided by a profound commitment to educational excellence, accessible skill development, and ethical leadership, ${founderName} founded ${name} with a transformative vision to uplift learners and professionals.\n\nUnder this visionary direction, the institution has cultivated a modern academic environment, high-calibre faculty, and benchmark learning infrastructure. The focus remains steadfast on individual student mentorship, practical problem solving, and long-term societal contribution.`;

  const contactPhone = profile?.phone || profile?.contact_phone || "";
  const contactEmail = profile?.email || profile?.contact_email || "";
  const whatsappClean = (profile?.whatsapp || contactPhone)?.replace(/[^0-9]/g, "");

  const leadershipPrinciples = [
    {
      title: "Student-First Mentorship",
      desc: "Every initiative is aligned with the academic and career elevation of our learners.",
      icon: Award,
    },
    {
      title: "Ethical & Transparent Governance",
      desc: "Honest communication and unwavering integrity in every facet of institutional life.",
      icon: ShieldCheck,
    },
    {
      title: "Innovation in Curriculum & Practice",
      desc: "Modern methodologies, tech-enabled learning, and industry-oriented skill sets.",
      icon: Sparkles,
    },
    {
      title: "Community Responsibility",
      desc: "Building accessible pathways so that financial or social barriers never stop ambition.",
      icon: Briefcase,
    },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* ================= 1. HERO HEADER ================= */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-primary/5 to-background py-14 lg:py-20">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">About Founder</span>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
              <User className="h-3.5 w-3.5" />
              <span>Visionary Leadership & Founding Story</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Meet Our Founder & Leadership
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Discover the story, principles, and visionary leadership behind <strong className="text-foreground">{name}</strong> that drive our commitment to quality, innovation, and trust.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Badge variant="outline" className="border-primary/30 bg-card text-foreground font-medium py-1 px-3">
                <Building2 className="size-3.5 mr-1.5 text-primary" /> {name}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold py-1 px-3">
                <ShieldCheck className="size-3 mr-1 inline" /> Verified Leadership
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. MAIN FOUNDER SPOTLIGHT ================= */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
            {/* Left Column: Portrait & Direct Connect Card */}
            <div className="flex flex-col items-center text-center space-y-5">
              {/* Photo Frame */}
              <div className="relative size-60 sm:size-72 rounded-3xl overflow-hidden bg-muted border-4 border-primary/20 shadow-xl group">
                {founderImage ? (
                  <Image
                    src={founderImage}
                    alt={founderName}
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 240px, 288px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 text-primary">
                    <User className="size-28 opacity-70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white backdrop-blur-md border-white/20">
                    Founder Profile
                  </Badge>
                </div>
              </div>

              {/* Title & Organization */}
              <div className="space-y-1">
                <h3 className="font-black text-xl text-foreground">{founderName}</h3>
                <p className="text-xs font-bold text-primary">{founderTitle}</p>
                <p className="text-xs text-muted-foreground">{name}</p>
              </div>

              {/* Direct Office Channels */}
              <div className="w-full p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5 text-xs text-left">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">
                  Founder's Office Desk
                </p>

                {contactPhone && (
                  <Button asChild size="sm" variant="outline" className="w-full justify-start rounded-xl text-xs font-semibold gap-2">
                    <a href={`tel:${contactPhone}`}>
                      <Phone className="size-3.5 text-primary" />
                      <span className="truncate">Call: {contactPhone}</span>
                    </a>
                  </Button>
                )}

                {whatsappClean && (
                  <Button asChild size="sm" variant="outline" className="w-full justify-start rounded-xl text-xs font-semibold gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                    <a href={`https://wa.me/${whatsappClean}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp Direct</span>
                    </a>
                  </Button>
                )}

                {contactEmail && (
                  <Button asChild size="sm" variant="outline" className="w-full justify-start rounded-xl text-xs font-semibold gap-2">
                    <a href={`mailto:${contactEmail}`}>
                      <Mail className="size-3.5 text-primary" />
                      <span className="truncate">Email Founder</span>
                    </a>
                  </Button>
                )}

                <div className="pt-2 text-center text-[10px] text-muted-foreground">
                  Official correspondence & executive inquiries
                </div>
              </div>
            </div>

            {/* Right Column: Narrative, Quote & Principles */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold text-xs uppercase tracking-wider">
                  The Journey & Inspiration
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  The Visionary Behind {name}
                </h2>
                <p className="text-xs sm:text-sm text-primary font-semibold">
                  {founderTitle} &bull; Leading with Purpose & Excellence
                </p>
              </div>

              {/* Quote Highlight */}
              <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-2xs">
                <Quote className="size-8 text-primary/30 absolute top-4 right-4" />
                <p className="text-sm sm:text-base italic font-medium text-foreground leading-relaxed">
                  &ldquo;Our aim has never been to merely run an institution, but to kindle latent potential, instill unshakeable confidence, and empower every individual with the knowledge to shape their destiny.&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-primary">
                  <span>— {founderName}</span>
                </div>
              </div>

              {/* Detailed Bio / Narrative */}
              <div className="text-sm sm:text-base leading-relaxed text-muted-foreground space-y-4 pt-2">
                {founderAbout
                  .split("\n\n")
                  .map((paragraph: string, pIdx: number) => (
                    <p key={pIdx} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
              </div>

              {/* Leadership Principles Cards */}
              <div className="pt-4 border-t border-border/80 space-y-4">
                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>Founding Leadership Pillars</span>
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  {leadershipPrinciples.map((pillar, idx) => {
                    const Icon = pillar.icon;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1.5"
                      >
                        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                          <Icon className="size-4 text-primary shrink-0" />
                          <span>{pillar.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {pillar.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. FOUNDER'S MESSAGE CARD ================= */}
      <section className="border-t border-border bg-gradient-to-b from-card via-muted/20 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl border border-primary/20 bg-card p-8 sm:p-12 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">A Message From The Founder</span>
                <h3 className="text-2xl font-black text-foreground">To Our Community & Aspirants</h3>
              </div>
              <Quote className="size-10 text-primary/20 hidden sm:block" />
            </div>

            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-muted-foreground font-normal">
              <p>
                When we embarked on this journey, our foremost commitment was to build an institution grounded in absolute authenticity, relentless quality, and genuine concern for individual growth. Today, seeing our alumni and community members thrive across diverse professions is our greatest reward.
              </p>
              <p>
                We invite you to experience our vibrant community, modern infrastructure, and passionate mentors. Whether you are stepping in to learn, collaborate, or grow, you will find dedicated partners in your journey at {name}.
              </p>
            </div>

            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-black text-base text-foreground">{founderName}</p>
                <p className="text-xs text-primary font-semibold">{founderTitle} &bull; {name}</p>
              </div>

              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs">
                <Link href="/contact">
                  <span>Connect With Us</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. INTERLINKING TO OTHER ABOUT PAGES ================= */}
      <section className="border-t border-border bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h3 className="text-2xl font-extrabold text-foreground">Explore More About {name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Learn about our organizational overview and core philosophical mission.
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
                  Discover our history, establishment, campus infrastructure, and official certifications.
                </p>
              </div>
            </Link>

            {/* Mission Card */}
            <Link
              href="/about/mission-vision"
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 shadow-xs hover:shadow-lg transition-all group flex items-start gap-4"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Target className="size-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    Mission, Vision & Strategic Goals
                  </h4>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Explore our core principles, strategic milestones, and institutional compass.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
