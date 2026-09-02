"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  UserCheck,
  Search,
  Filter,
  Send,
  Star,
  Award,
  BookOpen,
  Building2,
  MapPin,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
  Mail,
  Phone,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTeacherUrl } from "@/lib/utils/seo-slug";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { SharedPublicSidebar } from "@/components/public/shared-public-sidebar";
import { SharedInterstitialBanner } from "@/components/public/shared-interstitial-banner";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";
import { toast } from "sonner";

type Teacher = {
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

import { useCategoryAvailability } from "@/hooks/use-category-availability";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export function TeachersDirectory() {
  const { isInstitutionalAdmin } = useCategoryAvailability();
  const { activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const targetInstitutionId = activeInstitutionId || defaultEnvInstitutionId;
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || searchParams?.get("q") || "";
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  // Sync search parameter from URL when it changes
  useEffect(() => {
    const q = searchParams?.get("search") || searchParams?.get("q");
    if (q !== null && q !== undefined && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  // Left Sidebar & Modal Inquiry Form State
  const [selectedTeacherForInquiry, setSelectedTeacherForInquiry] = useState<Teacher | null>(null);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSubject, setFormSubject] = useState("Mathematics");
  const [formMessage, setFormMessage] = useState("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTeachers();
  }, [search, targetInstitutionId]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (targetInstitutionId) {
        params.set("institutionId", String(targetInstitutionId));
      }

      const res = await fetch(`/api/public/teachers?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.teachers) {
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInquiryDialog = (teacher: Teacher) => {
    setSelectedTeacherForInquiry(teacher);
    if (teacher.subjects.length > 0) {
      setFormSubject(teacher.subjects[0]);
    }
    setFormMessage(`Hi, I am interested in mentorship & learning ${teacher.subjects[0] || "subjects"} with ${teacher.full_name}. Please share course details and batch timings.`);
    setInquirySuccess(false);
    setInquiryDialogOpen(true);
  };

  const handleSelectTeacherForInquiry = (teacher: Teacher) => {
    setSelectedTeacherForInquiry(teacher);
    if (teacher.subjects.length > 0) {
      setFormSubject(teacher.subjects[0]);
    }
    setFormMessage(`Hi, I am interested in learning ${teacher.subjects[0] || "subjects"} with ${teacher.full_name}.`);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }

    setSubmittingInquiry(true);
    try {
      const res = await fetch("/api/student/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "teacher",
          entity_id: selectedTeacherForInquiry?.id || 0,
          student_name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim(),
          subject: formSubject,
          notes: formMessage.trim(),
          source: "Teachers Directory Inquiry",
        }),
      });

      if (res.ok) {
        setInquirySuccess(true);
        toast.success("Inquiry sent successfully!", {
          description: "The teacher / institution counselor will contact you shortly.",
        });
        setTimeout(() => {
          setInquiryDialogOpen(false);
          setFormName("");
          setFormEmail("");
          setFormPhone("");
          setFormMessage("");
        }, 2000);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit inquiry");
      }
    } catch {
      toast.error("Network error while submitting inquiry");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-card to-background p-6 sm:p-8 border border-border space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Verified Educational Faculty Directory
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Find & Connect with Top Teachers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse experienced subject specialists, professors, and competitive exam mentors across India.
            </p>
          </div>

          <div className="w-full md:w-auto flex items-center gap-3">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teacher name, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-10 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Main Listings Column */}
        <div className="space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Available Faculty Members ({teachers.length})
            </h3>
            <span className="text-xs text-muted-foreground">Showing verified educational teachers</span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground rounded-2xl border border-border bg-card/70 shadow-2xs">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs">Loading teacher listings...</span>
            </div>
          ) : teachers.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-3 shadow-2xs">
              <UserCheck className="h-10 w-10 mx-auto opacity-30 text-primary" />
              <p className="font-semibold text-base text-foreground">No Teachers Found</p>
              <p className="text-xs">Try clearing search keywords or selecting a different subject filter.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {teachers.map((teacher, idx) => {
                const teacherUrl = buildTeacherUrl(teacher.id, teacher.full_name, teacher.designation, teacher.institution_name, teacher.location);
                const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== teachers.length - 1;
                const bannerIdx = Math.floor(idx / 3);

                return (
                  <React.Fragment key={teacher.id}>
                    <div
                      className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1"
                    >
                      <div className="space-y-3">
                        {/* Header profile row */}
                        <div className="flex items-start gap-3">
                          {teacher.avatar_url ? (
                            <img
                              src={teacher.avatar_url}
                              alt={teacher.full_name}
                              className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/20 shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary text-white font-extrabold text-base flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                              {teacher.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h4 className="font-bold text-base text-foreground truncate">
                                <Link
                                  href={teacherUrl}
                                  className="hover:text-primary hover:underline"
                                >
                                  {teacher.full_name}
                                </Link>
                              </h4>
                              {teacher.is_verified && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              )}
                            </div>

                            <p className="text-xs font-semibold text-primary truncate mt-0.5">{teacher.designation}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{teacher.institution_name}</span>
                            </p>
                          </div>
                        </div>

                        {/* Stats strip */}
                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-muted/40 rounded-xl text-center text-xs">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Exp</p>
                            <p className="font-bold text-foreground">{teacher.experience_years}+ Yrs</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rating</p>
                            <p className="font-bold text-amber-500 flex items-center justify-center gap-0.5">
                              <Star className="h-3 w-3 fill-current" /> {teacher.rating ? Number(teacher.rating).toFixed(1) : "4.8"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Students</p>
                            <p className="font-bold text-foreground">{teacher.students_taught}+</p>
                          </div>
                        </div>

                        {/* Qualification & Subjects */}
                        <div className="space-y-1.5 text-xs">
                          <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                            <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate">{teacher.qualification}</span>
                          </p>

                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {teacher.subjects.slice(0, 3).map((sub, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-medium bg-primary/10 text-primary">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Bio */}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {teacher.bio}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFeedbackTarget({
                              type: "teacher",
                              id: teacher.id,
                              title: teacher.full_name,
                              subtitle: `${teacher.designation} • ${teacher.institution_name}`,
                              avg_rating: teacher.rating,
                              review_count: teacher.reviews_count,
                            });
                            setFeedbackOpen(true);
                          }}
                          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold text-amber-800 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer shadow-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                          <span>Reviews & Q&A</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenInquiryDialog(teacher)}
                          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Enquiry</span>
                        </Button>
                      </div>
                    </div>

                    {/* 200px Banner after every 3 items */}
                    {shouldInsertBanner && (
                      <SharedInterstitialBanner
                        bannerIndex={bannerIdx}
                        pageType="teachers"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar Options & Ads */}
        <SharedPublicSidebar pageType="teachers" />
      </div>

      {/* Universal Feedback & Comment Dialog for Teachers */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />

      {/* Universal Teacher Mentorship & Class Enquiry Dialog */}
      <CourseEnquiryDialog
        open={inquiryDialogOpen}
        onOpenChange={setInquiryDialogOpen}
        course={
          selectedTeacherForInquiry
            ? {
                id: selectedTeacherForInquiry.id,
                title: selectedTeacherForInquiry.full_name,
                institute: `${selectedTeacherForInquiry.designation} • ${selectedTeacherForInquiry.institution_name}`,
                type: "teacher",
              }
            : null
        }
      />
    </div>
  );
}
