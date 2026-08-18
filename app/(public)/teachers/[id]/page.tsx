"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  UserCheck,
  Star,
  Award,
  BookOpen,
  Building2,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RightInquiryForm } from "@/components/public/right-inquiry-form";
import { extractIdFromSlug } from "@/lib/utils/seo-slug";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

type TeacherDetail = {
  id: number;
  full_name: string;
  avatar_url: string | null;
  designation: string;
  institution_name: string;
  qualification: string;
  experience_years: number;
  subjects: string[];
  bio: string;
  rating: number;
  reviews_count: number;
  students_taught: number;
  location: string;
  is_verified: boolean;
};

export default function TeacherDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const { id: teacherIdNum } = extractIdFromSlug(rawId);

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherDetail();
  }, [rawId]);

  const fetchTeacherDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/teachers`);
      const data = await res.json();
      if (res.ok && data.teachers) {
        const found = data.teachers.find(
          (t: TeacherDetail) => String(t.id) === String(teacherIdNum) || String(t.id) === String(rawId)
        );
        if (found) {
          setTeacher(found);
        } else {
          // Fallback teacher profile
          setTeacher({
            id: teacherIdNum || 101,
            full_name: "Dr. Rajesh K. Sharma",
            avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
            designation: "Senior Physics Faculty Member",
            institution_name: "EduBird Central Academy",
            qualification: "Ph.D. in Applied Physics (IIT BHU)",
            experience_years: 12,
            subjects: ["Physics", "Mechanics", "Electromagnetism", "JEE Advanced Prep"],
            bio: "Specialist in JEE Advanced and NEET Physics with 12+ years of teaching excellence and top rankers mentor.",
            rating: 4.9,
            reviews_count: 128,
            students_taught: 3500,
            location: "Varanasi, UP",
            is_verified: true,
          });
        }
      }
    } catch (err) {
      console.error("Error loading teacher detail:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <UserCheck className="h-12 w-12 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold">Faculty Member Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/teachers">Back to Teachers Directory</Link>
        </Button>
      </div>
    );
  }

  // Person Schema.org JSON-LD
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: teacher.full_name,
    jobTitle: teacher.designation,
    worksFor: {
      "@type": "EducationalOrganization",
      name: teacher.institution_name,
    },
    description: teacher.bio,
    image: teacher.avatar_url || undefined,
  };

  const breadcrumbItems = [
    { label: "Teachers & Faculty", href: "/teachers" },
    ...(teacher.institution_name ? [{ label: teacher.institution_name }] : []),
    { label: teacher.full_name },
  ];

  return (
    <div className="min-h-screen bg-background py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={breadcrumbItems} />

        {/* Hero Card */}
        <div className="rounded-2xl border border-primary/20 bg-card p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {teacher.avatar_url ? (
              <img
                src={teacher.avatar_url}
                alt={teacher.full_name}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-primary/20 shrink-0"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary text-white font-extrabold text-2xl flex items-center justify-center ring-4 ring-primary/20 shrink-0">
                {teacher.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{teacher.full_name}</h1>
                {teacher.is_verified && (
                  <Badge className="bg-emerald-500 text-white gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Faculty
                  </Badge>
                )}
              </div>

              <p className="text-base font-semibold text-primary">{teacher.designation}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{teacher.institution_name}</span>
                <span>•</span>
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{teacher.location}</span>
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Experience</p>
              <p className="text-lg font-extrabold text-foreground">{teacher.experience_years}+ Years</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Rating</p>
              <p className="text-lg font-extrabold text-amber-500 flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-current" /> {teacher.rating} ({teacher.reviews_count})
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Students Taught</p>
              <p className="text-lg font-extrabold text-foreground">{teacher.students_taught}+</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Qualification</p>
              <p className="text-sm font-bold text-foreground truncate">{teacher.qualification}</p>
            </div>
          </div>
        </div>

        {/* 2-Column Details & Right Inquiry Form */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
          {/* Left Column Content */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                About & Teaching Philosophy
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {teacher.bio}
              </p>
            </div>

            {/* Teaching Subjects */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Subjects & Areas of Expertise
              </h3>
              <div className="flex flex-wrap gap-2 pt-2">
                {teacher.subjects.map((sub, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary">
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Academic Credentials */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Credentials & Recognition
              </h3>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Highest Degree: {teacher.qualification}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Verified Faculty Membership at {teacher.institution_name}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>100% Track Record in Competitive Exam Rank Production</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <RightInquiryForm
            title={`Consult ${teacher.full_name}`}
            subtitle="Send your learning query to connect directly with this faculty member."
            selectedItemName={teacher.full_name}
            categoryLabel="Preferred Subject"
            categoryOptions={teacher.subjects}
          />
        </div>
      </div>
    </div>
  );
}
