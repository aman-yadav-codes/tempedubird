"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Award,
  ShieldCheck,
  MapPin,
  Target,
  User,
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  CheckCircle2,
  Send,
  MessageCircle,
  Clock,
  Compass,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type AboutOverviewPageViewProps = {
  initialProfile?: any;
  companyPage?: any;
};

export function AboutOverviewPageView({ initialProfile, companyPage }: AboutOverviewPageViewProps) {
  const { activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const [profile, setProfile] = useState<any>(initialProfile);

  // Newsletter Subscription State
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const about =
    profile?.about?.trim() ||
    companyPage?.subtitle ||
    `${name} is dedicated to fostering excellence, transformative solutions, and trusted customer relationships.`;
  const location = profile?.location_name || profile?.full_address || (profile?.branches?.[0]?.city ? `${profile.branches[0].city}, ${profile.branches[0].state}` : profile?.city ? `${profile.city}, ${profile.state || ""}` : null);
  const heroImage = profile?.banner_url || profile?.logo_url;

  const founderName = profile?.founder_name?.trim() || "Leadership & Visionary Board";
  const founderTitle = profile?.founder_title?.trim() || "Founder & Managing Director";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = subscriberEmail.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch("/api/public/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          notes: "Newsletter subscription request from About Us Overview page",
          source: "about_newsletter",
          institution_id: profile?.id || defaultEnvInstitutionId,
        }),
      });
    } catch {
      // Graceful fallback
    }

    setIsSubmitting(false);
    setIsSubscribed(true);
    toast.success("Thank you for subscribing! You are now on our priority updates list.");
  };

  const corePillars = [
    {
      title: "Quality & Standard Assurance",
      text: "Committed to rigorous benchmarks, authenticity, and verified satisfaction across every program and service.",
      icon: ShieldCheck,
      badge: "Verified Quality",
    },
    {
      title: "Responsive Support & Mentorship",
      text: "Direct access to our dedicated assistance, counseling, and faculty advisory team whenever you need help.",
      icon: MessageCircle,
      badge: "Direct Support",
    },
    {
      title: "Continuous Innovation & Practice",
      text: "Consistently upgrading our curriculum, technology, and facilities to deliver an outstanding experience.",
      icon: Sparkles,
      badge: "Modern Infrastructure",
    },
    {
      title: "Inclusive & Career-Focused",
      text: "Creating practical pathways for students and clients from all backgrounds to achieve their career goals.",
      icon: Award,
      badge: "Career Growth",
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
            <span className="text-foreground font-semibold">About Us Overview</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs font-bold py-1 px-3">
                <ShieldCheck className="mr-1.5 size-3.5" />
                Verified & Certified Organization
              </Badge>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
                About {name}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {about}
              </p>

              {/* Quick Metadata Chips */}
              <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs font-semibold text-foreground">
                  <Building2 className="size-4 text-primary" />
                  <span>{typeLabel}</span>
                </span>

                {profile?.established_year && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs font-semibold text-foreground">
                    <Award className="size-4 text-primary" />
                    <span>Established {profile.established_year}</span>
                  </span>
                )}

                {location && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 shadow-2xs font-medium text-muted-foreground">
                    <MapPin className="size-4 text-primary" />
                    <span className="text-foreground">{location}</span>
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs sm:text-sm shadow-sm">
                  <Link href="/about/mission-vision">
                    <Target className="size-4 mr-1.5" />
                    <span>Our Mission & Vision</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="rounded-xl text-xs sm:text-sm font-semibold">
                  <Link href="/about/founder">
                    <User className="size-4 mr-1.5 text-primary" />
                    <span>Meet Our Founder</span>
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted">
                  <Link href="/contact">
                    <span>Contact Us</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Hero Showcase Media */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl ring-1 ring-black/5">
              {heroImage ? (
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-muted group">
                  <Image
                    src={heroImage}
                    alt={name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 460px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none space-y-1">
                    <Badge variant="secondary" className="text-[10px] bg-white/20 text-white backdrop-blur-md border-white/20">
                      Official Campus & Organization
                    </Badge>
                    <p className="text-base font-bold truncate drop-shadow-md">{name}</p>
                    <p className="text-xs text-white/80 drop-shadow-sm font-medium">{typeLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/11] flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted p-6 text-center">
                  <div className="size-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-2xl shadow-inner mb-3">
                    <Building2 className="size-8" />
                  </div>
                  <p className="font-bold text-foreground text-base sm:text-lg">{name}</p>
                  <p className="text-xs text-primary font-semibold mt-0.5">{typeLabel}</p>
                  <Badge variant="outline" className="mt-3 text-[11px] bg-background/80 border-primary/20 text-primary">
                    Official Profile
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. DEEP-DIVE SECTIONS (PROMINENT CARDS) ================= */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px]">
            Comprehensive Directory
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Discover What Defines Us
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Explore dedicated pages about our foundational compass and executive leadership.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Card 1: Mission, Vision & Strategic Goals */}
          <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 via-card to-card dark:from-blue-950/20 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="size-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Target className="size-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Strategic Compass</span>
                <h3 className="text-2xl font-black text-foreground mt-1 group-hover:text-blue-600 transition-colors">
                  Mission, Vision & Goals
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dive deep into our core philosophy, daily operational commitments, long-term roadmap, and measurable strategic milestones.
              </p>
              <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-blue-600" />
                  <span>Purpose-driven daily mission</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-blue-600" />
                  <span>Long-term visionary horizon</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-blue-600" />
                  <span>Strategic roadmap & benchmarks</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm">
                <Link href="/about/mission-vision">
                  <span>View Mission, Vision & Goals</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: About Founder & Leadership */}
          <div className="rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/60 via-card to-card dark:from-purple-950/20 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="size-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <User className="size-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Visionary Leadership</span>
                <h3 className="text-2xl font-black text-foreground mt-1 group-hover:text-purple-600 transition-colors">
                  About Our Founder
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Discover the story, principles, and personal journey of {founderName} ({founderTitle}), leading with integrity and commitment.
              </p>
              <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-600" />
                  <span>Founding vision & journey</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-600" />
                  <span>Founder's personal message</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-600" />
                  <span>Direct founder's office channels</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs sm:text-sm">
                <Link href="/about/founder">
                  <span>Meet Our Founder & Leadership</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. CORE VALUE PILLARS ================= */}
      <section className="border-t border-border bg-gradient-to-b from-card via-muted/20 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px]">
              Our Commitments
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Why Choose {name}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Core pillars upholding our standards, service excellence, and community trust.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {corePillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="size-6" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {pillar.badge}
                    </Badge>
                    <h4 className="font-bold text-base text-foreground">{pillar.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pillar.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 4. BRANCHES & CONTACT HELPLINES ================= */}
      {profile?.branches && profile.branches.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px]">
              Physical Presence
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Our Campus & Branch Locations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Visit us in person or reach out to our local branch administrative desks.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {profile.branches.map((b: any, idx: number) => (
              <div
                key={b.id || idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <span>{b.branch_name || `Branch ${idx + 1}`}</span>
                  </h4>
                  {b.city && (
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {b.city}
                    </Badge>
                  )}
                </div>

                {b.address && (
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{b.address}{b.city ? `, ${b.city}` : ""}{b.state ? `, ${b.state}` : ""}{b.pincode ? ` - ${b.pincode}` : ""}</span>
                  </p>
                )}

                {b.working_hours && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="size-3.5 text-primary shrink-0" />
                    <span>{b.working_hours}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= 5. NEWSLETTER / INQUIRY SUBSCRIPTION ================= */}
      <section className="border-t border-border bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm text-center space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Stay Connected</span>
              <h3 className="text-2xl font-black text-foreground">Subscribe for Updates & Announcements</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Get priority notifications about new programs, admissions, community events, and institutional milestones.
              </p>
            </div>

            {isSubscribed ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4" />
                <span>You are subscribed! Thank you for staying connected.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm h-11"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-5 text-xs sm:text-sm shrink-0"
                >
                  <span>{isSubmitting ? "Subscribing..." : "Subscribe"}</span>
                  <Send className="size-3.5 ml-1.5" />
                </Button>
              </form>
            )}

            <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <Link href="/contact" className="hover:text-primary transition-colors font-medium">
                Direct Contact Desk
              </Link>
              <span>&bull;</span>
              <Link href="/about/mission-vision" className="hover:text-primary transition-colors font-medium">
                Mission & Vision
              </Link>
              <span>&bull;</span>
              <Link href="/about/founder" className="hover:text-primary transition-colors font-medium">
                About Founder
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
