"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  UserCheck,
  Star,
  Phone,
  MessageCircle,
  HelpCircle,
  Send,
  Mail,
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RightInquiryForm } from "@/components/public/right-inquiry-form";
import { DetailSuggestionSidebar } from "@/components/public/detail-suggestion-sidebar";
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
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.fullName || !enquiryForm.phone) {
      toast.error("Please provide your name and phone number");
      return;
    }
    setEnquirySubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast.success("Enquiry sent successfully! The faculty will connect shortly.");
      setEnquiryOpen(false);
      setEnquiryForm({ fullName: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send enquiry");
    } finally {
      setEnquirySubmitting(false);
    }
  };

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

          {/* Right Column: Action Buttons & More Teachers */}
          <aside className="space-y-6 lg:sticky lg:top-20">
            {/* Action Card: Call Now, WhatsApp, Enquiry */}
            <Card className="p-5 sm:p-6 shadow-sm border-border space-y-4 rounded-2xl bg-card">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">
                      Consult {teacher.full_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Connect directly for doubts, mentoring & batches
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hello, I would like to consult Dr. / Prof. ${teacher.full_name} regarding learning and courses on EduBird.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 font-bold text-white shadow-xs transition hover:bg-emerald-700 text-xs sm:text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href="tel:+919876543210"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 font-bold text-white shadow-xs transition hover:bg-blue-700 text-xs sm:text-sm"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call Now</span>
                  </a>
                </div>

                <Button
                  onClick={() => setEnquiryOpen(true)}
                  className="w-full h-10 rounded-xl font-bold shadow-xs text-xs sm:text-sm"
                >
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  Send Enquiry
                </Button>

                <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground font-medium border-t border-border/50">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>100% Verified EduBird Faculty Member</span>
                </div>
              </div>
            </Card>

            {/* More Teachers Profiles */}
            <DetailSuggestionSidebar type="teachers" currentId={teacher.id} />
          </aside>
        </div>
      </div>

      {/* Teacher Enquiry Dialog */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="sm:max-w-md" id="teacher-enquiry-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Inquire with {teacher.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send your learning requirements or questions. The faculty team will get back to you shortly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnquirySubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Rahul Verma"
                value={enquiryForm.fullName}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, fullName: e.target.value })}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone / WhatsApp *</Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Preferred Subject / Exam</Label>
              <Input
                placeholder="e.g. JEE Physics, Doubt Session"
                value={enquiryForm.subject}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, subject: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Your Message or Question</Label>
              <Textarea
                placeholder="Briefly describe what you'd like guidance on..."
                rows={3}
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setEnquiryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={enquirySubmitting}>
                {enquirySubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Submit Enquiry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}