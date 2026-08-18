import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Award, BookOpen, Building2, CheckCircle2, GraduationCap, MapPin, ShieldCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `About ${name}`,
    description: profile?.about ?? "Learn more about EduBird and our verified learning network.",
  };
}

export default async function AboutPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "about-us");

  const name = profile?.name ?? companyPage?.title ?? "EduBird";
  const typeLabel = [profile?.type_name, profile?.subtype_name].filter(Boolean).join(" / ") || "Learning Platform";
  const about =
    profile?.about?.trim() ||
    companyPage?.subtitle ||
    `${name} is committed to helping learners discover structured programs, supportive teachers, and a reliable academic experience.`;
  const location = profile?.full_address || profile?.location_name;
  const heroImage = profile?.banner_url || profile?.logo_url;
  const highlights: Array<{ title: string; text: string; icon: LucideIcon }> = [
    {
      title: "Focused Learning",
      text: "Programs are arranged to help students learn with clarity and consistency.",
      icon: BookOpen,
    },
    {
      title: "Trusted Management",
      text: "Institution data, courses, and communication stay connected in EduBird.",
      icon: ShieldCheck,
    },
    {
      title: "Student Support",
      text: "Learners and guardians can connect with the institution through one public site.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-16">
          <div className="min-w-0">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {profile ? "Verified Institution" : "Official Platform"}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{about}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <Building2 className="h-4 w-4 text-primary" />
                {typeLabel}
              </span>
              {profile?.established_year && (
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <Award className="h-4 w-4 text-primary" />
                  Established {profile.established_year}
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {location}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {heroImage ? (
              <Image src={heroImage} alt={name} width={840} height={520} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-primary/10">
                <GraduationCap className="h-20 w-20 text-primary" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      {companyPage?.content && (
        <section className="container mx-auto px-4 py-10">
          <div
            className="prose prose-slate dark:prose-invert max-w-4xl rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs"
            dangerouslySetInnerHTML={{ __html: companyPage.content }}
          />
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <Icon className="mb-4 h-7 w-7 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-border bg-card p-6 shadow-xs">
          <h2 className="text-2xl font-semibold text-foreground">Learning With {name}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
            Browse active courses, compare available programs, and contact us directly for admissions, academic details, fee structure, or support.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/courses">View Courses</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact {profile ? "Institution" : "EduBird"}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
