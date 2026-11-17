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
  Mail,
  Send,
  Phone,
  MessageCircle,
  Sparkles,
  Bell,
  ArrowRight,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type AboutPageViewProps = {
  initialProfile: any;
  companyPage: any;
};

export function AboutPageView({ initialProfile, companyPage }: AboutPageViewProps) {
  const { user } = useAuthStore();
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

  const missionText =
    profile?.mission?.trim() ||
    "To deliver accessible, high-impact solutions through expert guidance, state-of-the-art practices, and unwavering commitment to quality and customer success.";

  const visionText =
    profile?.vision?.trim() ||
    "To be a benchmark of excellence, trusted leadership, and sustainable community impact, creating enduring value for all stakeholders.";

  const goalText =
    profile?.goal?.trim() ||
    "Foster continuous improvement, uphold transparent leadership, deliver exceptional customer value, and maintain world-class quality standards across all operations.";

  const founderName = profile?.founder_name?.trim() || "Leadership & Visionary Board";
  const founderTitle = profile?.founder_title?.trim() || "Founder & Managing Director";
  const founderAbout =
    profile?.founder_about?.trim() ||
    "Guided by a profound commitment to quality, innovation, and ethical leadership, our founders have established benchmark standards in service excellence and long-term customer satisfaction.";

  const contactPhone = profile?.phone || profile?.contact_phone || "";
  const contactEmail = profile?.email || profile?.contact_email || "";
  const whatsappClean = (profile?.whatsapp || contactPhone)?.replace(/[^0-9]/g, "");

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
          notes: "Newsletter subscription request from About Us page",
          source: "about_newsletter",
          institution_id: profile?.id || defaultEnvInstitutionId,
        }),
      });
    } catch {
      // Graceful degradation
    }

    setIsSubmitting(false);
    setIsSubscribed(true);
    toast.success("Thank you for subscribing! You are now on our priority updates list.");
  };

  // Universal value pillars suitable for any business type
  const universalPillars: Array<{ title: string; text: string; icon: LucideIcon; badge: string }> = [
    {
      title: "Quality & Standard Assurance",
      text: "Committed to rigorous benchmarks, authenticity, and verified satisfaction across every offering.",
      icon: ShieldCheck,
      badge: "Verified Quality",
    },
    {
      title: "Responsive Support & Care",
      text: "Direct access to our dedicated assistance and advisory team whenever you need help or enquiries.",
      icon: MessageCircle,
      badge: "Fast Support",
    },
    {
      title: "Continuous Innovation & Value",
      text: "Consistently upgrading our solutions, catalog, and infrastructure to bring you the best experience.",
      icon: Sparkles,
      badge: "Modern Approach",
    },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* ================= 1. HERO & OVERVIEW SECTION ================= */}
      <section id="overview" className="border-b border-border bg-gradient-to-b from-primary/5 via-card/40 to-background scroll-mt-20 relative">
        <span id="institute" className="absolute -top-24 pointer-events-none" />
        <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:py-16">
          <div className="min-w-0">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs font-bold py-1 px-3">
              <ShieldCheck className="mr-1.5 size-3.5" />
              Verified & Certified Organization
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              About {name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm sm:text-base lg:text-lg leading-relaxed text-muted-foreground font-normal">
              {about}
            </p>

            {/* Quick Metadata Chips */}
            <div className="mt-6 flex flex-wrap gap-2.5 text-xs sm:text-sm">
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

            {/* In-page Navigation Jump Links */}
            <div className="mt-8 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Explore:
              </span>
              <a
                href="#mission-vision"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                Mission, Vision & Goals
              </a>
              <a
                href="#founder"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                About Founder & Leadership
              </a>
              <a
                href="#subscribe-connect"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                Subscribe & Stay Connected
              </a>
            </div>
          </div>

          {/* Right Hero Showcase Card */}
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card shadow-lg ring-1 ring-black/5">
            {heroImage ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <Image
                  src={heroImage}
                  alt={name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 440px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                  <p className="text-sm font-bold truncate drop-shadow-md">{name}</p>
                  <p className="text-xs text-white/80 drop-shadow-sm font-medium">{typeLabel}</p>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted p-6 text-center">
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
      </section>

      {/* ================= 2. MISSION, VISION & GOALS SECTION ================= */}
      <section id="mission-vision" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[11px]">
            Core Philosophy & Roadmap
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Mission, Vision & Goals
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            The foundational pillars guiding our institutional standards, quality execution, and long-term community value.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Mission Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 via-card to-card dark:from-blue-950/20 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="size-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Target className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>Our Mission</span>
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {missionText}
            </p>
          </div>

          {/* Vision Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-purple-200/60 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/60 via-card to-card dark:from-purple-950/20 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="size-12 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Compass className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>Our Vision</span>
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {visionText}
            </p>
          </div>

          {/* Goals Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-b from-emerald-50/60 via-card to-card dark:from-emerald-950/20 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="size-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
              <Award className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>Our Strategic Goals</span>
            </h3>

            {/* Check if goalText has bulleted / multi-line structure */}
            {goalText.includes("\n") ? (
              <div className="space-y-2.5">
                {goalText
                  .split("\n")
                  .map((g) => g.trim())
                  .filter(Boolean)
                  .map((goalLine, gIdx) => {
                    const colonIdx = goalLine.indexOf(":");
                    const title = colonIdx > -1 ? goalLine.slice(0, colonIdx).trim() : null;
                    const desc = colonIdx > -1 ? goalLine.slice(colonIdx + 1).trim() : goalLine;

                    return (
                      <div key={gIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-muted-foreground leading-snug">
                          {title && <span className="font-bold text-foreground">{title}: </span>}
                          <span>{desc}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {goalText}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ================= 3. ABOUT FOUNDER & LEADERSHIP SECTION ================= */}
      <section id="founder" className="border-t border-border bg-muted/20 py-16 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
            <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] items-start">
              {/* Founder Avatar / Photograph */}
              <div className="flex flex-col items-center text-center">
                <div className="relative size-44 sm:size-48 rounded-2xl overflow-hidden bg-muted border-2 border-primary/20 shadow-md">
                  {profile?.founder_image_url ? (
                    <Image
                      src={profile.founder_image_url}
                      alt={founderName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 text-primary">
                      <User className="size-20 opacity-80" />
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <h4 className="font-bold text-sm text-foreground">{founderName}</h4>
                  <p className="text-xs text-primary font-medium">{founderTitle}</p>
                </div>
              </div>

              {/* Founder Biography & Story */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold text-xs">
                    Institutional Leadership
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <ShieldCheck className="size-3 mr-1 inline" /> Verified Founder
                  </Badge>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {founderName}
                  </h2>
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    {founderTitle} &bull; {name}
                  </p>
                </div>

                {/* Render paragraphs cleanly */}
                <div className="text-sm sm:text-base leading-relaxed text-muted-foreground/95 space-y-3 pt-1 border-t border-border/50">
                  {founderAbout
                    .split("\n\n")
                    .map((paragraph: string, pIdx: number) => (
                      <p key={pIdx} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                </div>

                {/* Founder / Office Contact Buttons */}
                {(contactPhone || contactEmail || whatsappClean) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-3">
                    {contactPhone && (
                      <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5">
                        <a href={`tel:${contactPhone}`}>
                          <Phone className="size-3.5 text-primary" />
                          <span>Call Office</span>
                        </a>
                      </Button>
                    )}

                    {whatsappClean && (
                      <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                        <a href={`https://wa.me/${whatsappClean}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      </Button>
                    )}

                    {contactEmail && (
                      <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5">
                        <a href={`mailto:${contactEmail}`}>
                          <Mail className="size-3.5 text-primary" />
                          <span>Send Email</span>
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. UNIVERSAL VALUE PILLARS & SUBSCRIBE SECTION ================= */}
      <section id="subscribe-connect" className="container mx-auto px-4 py-16 scroll-mt-20">
        {/* 3 Universal Pillars for all businesses */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {universalPillars.map(({ title, text, icon: Icon, badge }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="size-5" />
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {badge}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Universal Subscribe & Connect Card (Suitable for all business types) */}
        <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-black text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Subtle Decorative Ambient Background Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 mb-3 text-xs font-semibold px-3 py-1">
              <Bell className="size-3.5 mr-1.5 text-amber-300" />
              Stay Connected & In The Loop
            </Badge>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Subscribe to Updates from {name}
            </h3>

            <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl font-normal">
              Get the latest news, official announcements, product and service launches, seasonal offers, and helpful insights delivered directly to your inbox.
            </p>

            {/* Newsletter Subscription Form */}
            {!isSubscribed ? (
              <form onSubmit={handleSubscribe} className="mt-8 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/50" />
                    <Input
                      type="email"
                      required
                      placeholder="Enter your email address..."
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary focus:ring-primary rounded-xl text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg gap-2 cursor-pointer transition-all hover:scale-105 shrink-0"
                  >
                    {isSubmitting ? (
                      <span>Subscribing...</span>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>Subscribe Now</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-white/60 flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>We value your privacy. Unsubscribe at any time. No spam, ever.</span>
                </p>
              </form>
            ) : (
              <div className="mt-8 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 max-w-xl">
                <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-white">You&apos;re Subscribed!</h4>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Thank you for staying connected. We&apos;ll keep you posted with our latest updates and announcements.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Action Navigation Buttons */}
            <div className="mt-10 pt-6 border-t border-white/15 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md">
                <Link href="/contact">
                  <span>Contact Our Office</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="rounded-xl border-white/30 text-white hover:bg-white/10 font-bold">
                <Link href="/explore">
                  <span>Explore Catalog & Offerings</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
