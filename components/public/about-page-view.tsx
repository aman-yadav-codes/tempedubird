"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Target,
  Compass,
  Lightbulb,
  User,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type AboutPageViewProps = {
  initialProfile: any;
  companyPage: any;
};

export function AboutPageView({ initialProfile, companyPage }: AboutPageViewProps) {
  const { user } = useAuthStore();
  const { activeInstitution, activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const [profile, setProfile] = useState<any>(initialProfile);

  const [facilities, setFacilities] = useState<any[]>([]);

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

    const facUrl = instId
      ? `/api/public/facilities?institutionId=${instId}`
      : "/api/public/facilities";

    fetch(facUrl)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setFacilities(json.data);
        }
      })
      .catch(() => undefined);
  }, [defaultEnvInstitutionId, initialProfile]);

  const name = profile?.name || (defaultEnvInstitutionId ? "Institution" : companyPage?.title || "EduBird");
  const typeLabel = [profile?.type_name, profile?.subtype_name].filter(Boolean).join(" / ") || "Educational Institution";
  const about =
    profile?.about?.trim() ||
    companyPage?.subtitle ||
    `${name} is dedicated to fostering academic excellence, transformative learning, and comprehensive career development for learners.`;
  const location = profile?.location_name || profile?.full_address || (profile?.branches?.[0]?.city ? `${profile.branches[0].city}, ${profile.branches[0].state}` : null);
  const heroImage = profile?.banner_url || profile?.logo_url;

  const missionText =
    profile?.mission?.trim() ||
    "To deliver accessible, high-impact education through experiential learning, world-class faculty mentorship, and innovative pedagogical practices that empower students to excel globally.";

  const visionText =
    profile?.vision?.trim() ||
    "To be a benchmark center of academic excellence, research, and holistic student development, creating leaders who inspire societal progress and technological innovation.";

  const goalText =
    profile?.goal?.trim() ||
    "Foster continuous learning, uphold ethical leadership, maintain 100% curriculum relevance to modern industry standards, and cultivate inclusive campus environments.";

  const founderName = profile?.founder_name?.trim() || (profile ? "Institutional Leadership Board" : "Founding Team & Visionaries");
  const founderTitle = profile?.founder_title?.trim() || (profile ? "Founder & Chancellor / Chairperson" : "Founding Team & Educational Visionaries");
  const founderAbout =
    profile?.founder_about?.trim() ||
    "Guided by a profound commitment to educational equity and modern learning systems, our leadership has established benchmark standards in curriculum design, student welfare, and progressive pedagogy.";

  const highlights: Array<{ title: string; text: string; icon: LucideIcon }> = [
    {
      title: "Focused Learning",
      text: "Curriculum designed with industry and academic standards to help students achieve tangible success.",
      icon: BookOpen,
    },
    {
      title: "Trusted Management",
      text: "Comprehensive ERP-backed operations ensuring seamless admissions, examinations, and student services.",
      icon: ShieldCheck,
    },
    {
      title: "Dedicated Student Support",
      text: "Continuous mentorship, career counseling, library resources, and dedicated faculty support.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* 1. HERO & INSTITUTE OVERVIEW (#institute) */}
      <section id="institute" className="border-b border-border bg-gradient-to-b from-rose-50/40 via-card/50 to-background scroll-mt-20">
        <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-16">
          <div className="min-w-0">
            <Badge className="mb-4 bg-rose-600/10 text-rose-700 hover:bg-rose-600/20 border-rose-200">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {profile ? "Verified Institution" : "Official Education Hub"}
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              About {name}
            </h1>
            <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground">{about}</p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs">
                <Building2 className="h-4 w-4 text-rose-600" />
                <span className="font-semibold text-foreground">{typeLabel}</span>
              </span>
              {profile?.established_year && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs">
                  <Award className="h-4 w-4 text-rose-600" />
                  Established <span className="font-semibold text-foreground">{profile.established_year}</span>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  <span className="font-medium text-foreground">{location}</span>
                </span>
              )}
            </div>

            {/* Quick in-page nav pills */}
            <div className="mt-8 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Jump to:</span>
              <a
                href="#mission-vision"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 transition-colors"
              >
                Mission & Vision
              </a>
              <a
                href="#founder"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 transition-colors"
              >
                About Founder
              </a>
              <a
                href="#facilities"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 transition-colors"
              >
                Facilities & Infrastructure
              </a>
              <a
                href="#institute"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 transition-colors"
              >
                About Institute
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg ring-1 ring-black/5">
            {heroImage ? (
              <Image src={heroImage} alt={name} width={840} height={520} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-rose-100/60 p-6 text-center">
                <GraduationCap className="h-16 w-16 text-rose-700 mb-2" />
                <p className="font-bold text-gray-800 text-lg">{name}</p>
                <p className="text-xs text-rose-700/80 font-medium">Campus of Academic Excellence</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. MISSION, VISION & GOALS SECTION (#mission-vision) */}
      <section id="mission-vision" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-2 border-rose-300 bg-rose-50 text-rose-700 font-bold uppercase tracking-wider text-[11px]">
            Core Philosophy & Roadmap
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Mission, Vision & Goals
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            The foundational pillars that guide our institutional standards, curriculum excellence, and community impact.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Mission Card */}
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/50 to-card p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="h-12 w-12 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {missionText}
            </p>
          </div>

          {/* Vision Card */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-card p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {visionText}
            </p>
          </div>

          {/* Goals Card */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-card p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Lightbulb className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Goals</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {goalText}
            </p>
          </div>
        </div>
      </section>

      {/* 3. ABOUT FOUNDER SECTION (#founder) */}
      <section id="founder" className="border-t border-border bg-muted/20 py-16 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
            <div className="grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] items-center">
              {/* Founder Avatar / Photo */}
              <div className="flex flex-col items-center text-center">
                <div className="relative h-40 w-40 sm:h-44 sm:w-44 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-700 to-[#800000] text-white flex items-center justify-center shadow-md border-2 border-rose-200">
                  {profile?.founder_image_url ? (
                    <Image
                      src={profile.founder_image_url}
                      alt={founderName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-20 w-20 text-white/90" />
                  )}
                </div>
              </div>

              {/* Founder Biography */}
              <div className="space-y-3">
                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 font-semibold text-xs">
                  Institutional Leadership
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{founderName}</h2>
                <p className="text-sm font-semibold text-rose-700">{founderTitle}</p>
                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground pt-2">
                  {founderAbout}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FACILITIES & INFRASTRUCTURE SECTION (#facilities) */}
      <section id="facilities" className="border-t border-border bg-background py-16 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="mb-2 border-rose-300 bg-rose-50 text-rose-700 font-bold uppercase tracking-wider text-[11px]">
              Campus Amenities & Features
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              World-Class Facilities & Infrastructure
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Explore the academic laboratories, modern amphitheaters, sports arenas, and student living facilities configured at our campus.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((fac, idx) => {
              const facTitle = fac.title || fac.name || fac.facility_type_name || `Campus Facility ${idx + 1}`;
              const facDesc = fac.description || fac.ai_description?.summary || "Comprehensive campus facility maintained with modern equipment and student amenities.";
              const facImage = fac.image_url || fac.media?.[0]?.url || "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80";

              return (
                <div
                  key={fac.id || idx}
                  className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-rose-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <Image
                      src={facImage}
                      alt={facTitle}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/75 text-white backdrop-blur-md border-0 text-[10px] font-bold">
                        {fac.facility_type_name || "Infrastructure"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-rose-700 transition-colors">
                        {facTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {facDesc}
                      </p>
                    </div>

                    {Array.isArray(fac.media) && fac.media.length > 1 && (
                      <div className="pt-2 flex items-center gap-1.5 overflow-x-auto">
                        {fac.media.slice(0, 3).map((m: any, mIdx: number) => (
                          <div key={m.id || mIdx} className="relative h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                            <Image src={m.url} alt="Facility preview" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. INSTITUTION HIGHLIGHTS & CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-rose-200 transition-colors">
              <Icon className="mb-4 h-8 w-8 text-rose-600" />
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Call to action card */}
        <div className="mt-12 rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-900 via-[#800000] to-rose-950 p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to explore programs at {name}?</h3>
            <p className="mt-3 text-sm sm:text-base text-rose-100/90 leading-relaxed">
              Browse verified courses, enroll online, review syllabi, or connect directly with our academic admissions office today.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-[#800000] hover:bg-rose-50 font-bold shadow-md">
                <Link href="/courses">Explore All Courses</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="border-white/30 text-white hover:bg-white/10 font-bold">
                <Link href="/contact">Contact Campus Office</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
