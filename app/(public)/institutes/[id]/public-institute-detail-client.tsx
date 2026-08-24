"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Globe,
  Building2,
  BookOpen,
  Users,
  Award,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Percent,
  ChevronRight,
  School,
  Target,
  UserCheck,
  Video,
  Film,
  Play,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RightInquiryForm } from "@/components/public/right-inquiry-form";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";

const fallbackBanners = [
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
];

export function PublicInstituteDetailClient({ data }: { data: any }) {
  const { profile, programs = [], courses = [], facilities = [], placements = [], cutoffs = [], scholarships = [], branches = [], mediaList = [], facultyList = [], hostels = [], libraries = [] } = data;
  const [activeTab, setActiveTab] = useState("overview");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedEnrollProgram, setSelectedEnrollProgram] = useState<ProgramEnrollmentTarget | null>(null);

  const [universalFeedbackOpen, setUniversalFeedbackOpen] = useState(false);
  const [selectedUniversalTarget, setSelectedUniversalTarget] = useState<UniversalEntityTarget | null>(null);

  const handleEnrollProgramClick = (prog: any) => {
    setSelectedEnrollProgram({
      id: prog.id,
      title: prog.title,
      institution_id: profile.id,
      institution_name: profile.name,
      fee_amount: prog.fee_amount,
      fee_unit: prog.fee_unit,
      duration: `${prog.duration_value || 4} ${prog.duration_unit || "Years"}`,
      about: prog.about,
    });
    setEnrollModalOpen(true);
  };

  const galleryImages = mediaList.filter((m: any) => m.media_type === "image" || m.media_type === "gallery" || m.media_type === "photo");
  const galleryVideos = mediaList.filter((m: any) => m.media_type === "video");

  const bannerImg = profile.banner_url || fallbackBanners[profile.id % fallbackBanners.length];
  const locText = profile.location_name || "Varanasi, Uttar Pradesh";
  const establishedText = profile.established_year || "2015";
  const typeText = profile.type_name || "Higher Education Institute";

  // Calculate stats
  const totalProgramsCount = programs.length;
  const studentCountDisplay = profile.student_count > 0 ? `${profile.student_count}+` : "500+";
  
  // Placement stats
  const latestPlacement = placements[0] || null;
  const avgPackageFormatted = latestPlacement
    ? `₹${(Number(latestPlacement.average_package) / 100000).toFixed(1)} LPA`
    : "₹9.8 LPA";
  const highPackageFormatted = latestPlacement
    ? `₹${(Number(latestPlacement.highest_package) / 100000).toFixed(1)} LPA`
    : "₹34.0 LPA";
  const placementRateFormatted = latestPlacement
    ? `${Number(latestPlacement.placement_percentage).toFixed(1)}%`
    : "92.5%";

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top Banner & Header */}
      <div className="relative w-full h-[260px] sm:h-[320px] bg-muted overflow-hidden">
        <Image
          src={bannerImg}
          alt={`${profile.name} Cover Banner`}
          fill
          priority
          className="object-cover brightness-[0.75]"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="container mx-auto px-4 h-full relative z-10 flex items-end pb-6">
          <Button variant="outline" size="sm" className="absolute top-6 left-4 bg-background/80 backdrop-blur-xs gap-2" asChild>
            <Link href="/institutes">
              <ArrowLeft className="h-4 w-4" />
              Back to Institutes
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 w-full">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-background bg-card p-2 shadow-xl shrink-0 overflow-hidden flex items-center justify-center">
              {profile.logo_url ? (
                <Image src={profile.logo_url} alt={profile.name} fill className="object-contain p-2" unoptimized />
              ) : (
                <GraduationCap className="h-14 w-14 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight drop-shadow-xs">
                  {profile.name}
                </h1>
                <Badge className="bg-emerald-600 text-white font-semibold gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified Institute
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 text-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {locText}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  {typeText}
                </span>
                {establishedText && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    Est. {establishedText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="container mx-auto px-4 mt-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
          {/* Left Column: Details & Tabs */}
          <div className="space-y-6 min-w-0">
            {/* Quick Metrics Header Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 bg-card/60 backdrop-blur-xs border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{totalProgramsCount || 12}</p>
                    <p className="text-xs text-muted-foreground font-medium">Programs Offered</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/60 backdrop-blur-xs border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{placementRateFormatted}</p>
                    <p className="text-xs text-muted-foreground font-medium">Placement Rate</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/60 backdrop-blur-xs border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{avgPackageFormatted}</p>
                    <p className="text-xs text-muted-foreground font-medium">Average Package</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/60 backdrop-blur-xs border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{studentCountDisplay}</p>
                    <p className="text-xs text-muted-foreground font-medium">Active Students</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto pb-1 scrollbar-none">
                <TabsList className="h-12 w-full justify-start rounded-xl bg-card border border-border p-1 gap-1 min-w-max">
                  <TabsTrigger value="overview" className="rounded-lg font-semibold gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="programs" className="rounded-lg font-semibold gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Programs ({programs.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="facilities" className="rounded-lg font-semibold gap-2">
                    <School className="h-4 w-4" />
                    <span>Facilities ({facilities.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="hostels" className="rounded-lg font-semibold gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Hostel Facilities ({hostels.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="libraries" className="rounded-lg font-semibold gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Library & E-Resources ({libraries.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="rounded-lg font-semibold gap-2">
                    <Film className="h-4 w-4" />
                    <span>Gallery ({galleryImages.length + galleryVideos.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="faculty" className="rounded-lg font-semibold gap-2">
                    <Users className="h-4 w-4" />
                    <span>Faculty & Staff ({facultyList.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="placements" className="rounded-lg font-semibold gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Placements ({placements.length} Years)</span>
                  </TabsTrigger>
                  <TabsTrigger value="cutoffs" className="rounded-lg font-semibold gap-2">
                    <Percent className="h-4 w-4" />
                    <span>Cut-Off Marks</span>
                  </TabsTrigger>
                  <TabsTrigger value="scholarships" className="rounded-lg font-semibold gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Scholarships</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 1. OVERVIEW TAB */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">About {profile.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p className="whitespace-pre-line">
                      {profile.about ||
                        `${profile.name} is a premier educational institution located in ${locText}. Dedicated to high quality academic standards, top placement support, and modern campus infrastructure.`}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Institution Type</p>
                        <p className="font-semibold text-foreground">{typeText} {profile.subtype_name ? `(${profile.subtype_name})` : ""}</p>
                      </div>
                      {profile.board_name && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Affiliated Board / Council</p>
                          <p className="font-semibold text-foreground">{profile.board_name}</p>
                        </div>
                      )}
                      {profile.parent_university_name && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Parent University</p>
                          <p className="font-semibold text-foreground">{profile.parent_university_name}</p>
                        </div>
                      )}
                      {profile.established_year && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Established Year</p>
                          <p className="font-semibold text-foreground">{profile.established_year}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Mission, Vision & Goals */}
                {(profile.mission || profile.vision || profile.goal) && (
                  <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Mission, Vision & Objectives
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {profile.mission && (
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Mission Statement</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{profile.mission}</p>
                        </div>
                      )}
                      {profile.vision && (
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Vision Statement</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{profile.vision}</p>
                        </div>
                      )}
                      {profile.goal && (
                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Goals & Objectives</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{profile.goal}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* About Founder & Leadership */}
                {(profile.founder_name || profile.founder_about || profile.founder_image_url) && (
                  <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      About Founder & Leadership
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      {profile.founder_image_url ? (
                        <img
                          src={profile.founder_image_url}
                          alt={profile.founder_name || "Founder"}
                          className="h-20 w-20 rounded-full object-cover border-2 border-primary/20 bg-muted shrink-0"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                          {profile.founder_name ? profile.founder_name[0]?.toUpperCase() : "F"}
                        </div>
                      )}
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg text-foreground">{profile.founder_name || "Founder"}</h4>
                        {profile.founder_title && (
                          <Badge variant="secondary" className="font-normal text-xs">
                            {profile.founder_title}
                          </Badge>
                        )}
                        {profile.founder_about && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pt-2">
                            {profile.founder_about}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Branch Office Locations & Contacts */}
                {branches.length > 0 && (
                  <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Campus & Branch Offices ({branches.length})
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {branches.map((b: any) => {
                        const phonesList = Array.isArray(b.phones) ? b.phones : [];
                        const emailsList = Array.isArray(b.emails) ? b.emails : [];

                        return (
                          <div key={b.id} className="rounded-xl border p-4 bg-card/60 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                {b.branch_name}
                              </h4>
                              {b.is_primary && (
                                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                                  Main Campus
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {[b.address, b.city, b.state, b.pincode].filter(Boolean).join(", ")}
                            </p>

                            {b.working_hours && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                {b.working_hours}
                              </p>
                            )}

                            {/* Titled Phones */}
                            {phonesList.length > 0 && (
                              <div className="space-y-1 pt-2 border-t border-border/50">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Numbers</p>
                                <div className="space-y-1">
                                  {phonesList.map((p: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">{p.title || "Contact"}:</span>
                                      <a href={`tel:${p.phone}`} className="font-semibold text-primary hover:underline">
                                        {p.phone}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Titled Emails */}
                            {emailsList.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Addresses</p>
                                <div className="space-y-1">
                                  {emailsList.map((e: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">{e.title || "Email"}:</span>
                                      <a href={`mailto:${e.email}`} className="font-semibold text-primary hover:underline truncate max-w-[180px]">
                                        {e.email}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* 2. PROGRAMS & COURSES TAB */}
              <TabsContent value="programs" className="mt-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center justify-between">
                  <span>Degree & Diploma Programs Offered</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {programs.length + courses.length} Active Courses & Programs
                  </Badge>
                </h2>

                {/* Courses List */}
                {courses.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Courses & Streams ({courses.length})
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {courses.map((course: any) => (
                        <Card key={course.id} className="p-5 hover:border-primary/50 transition-colors shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-base font-bold text-foreground">{course.course_name}</h4>
                              {course.stream && (
                                <Badge variant="secondary" className="text-xs font-semibold mt-1">
                                  {course.stream}
                                </Badge>
                              )}
                            </div>
                            {course.board_or_university && (
                              <Badge variant="outline" className="text-[11px] font-medium">
                                {course.board_or_university}
                              </Badge>
                            )}
                          </div>

                          {course.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                          )}

                          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                            {course.price ? (
                              <div>
                                <span className="text-muted-foreground">Fee / Price: </span>
                                <span className="font-extrabold text-foreground text-sm">{course.price}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Contact for fees</span>
                            )}

                            {course.duration && (
                              <span className="font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                {course.duration}
                              </span>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Programs List */}
                {programs.length > 0 ? (
                  <div className="space-y-3">
                    {courses.length > 0 && (
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pt-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Academic Programs ({programs.length})
                      </h3>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {programs.map((prog: any) => (
                        <Card key={prog.id} className="p-5 hover:border-primary/50 transition-colors shadow-2xs">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge variant="secondary" className="font-medium text-xs">
                              {prog.program_type_name || "Degree Course"}
                            </Badge>
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                              {prog.seats_available || 60} Seats
                            </Badge>
                          </div>

                          <h3 className="text-lg font-bold text-foreground mb-1">{prog.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{prog.about || "Comprehensive degree program with modern syllabus and lab practice."}</p>

                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs mb-3">
                            <div>
                              <span className="text-muted-foreground">Course Fee: </span>
                              <span className="font-extrabold text-foreground text-sm">₹{Number(prog.fee_amount || 120000).toLocaleString("en-IN")}</span>
                              <span className="text-muted-foreground"> / {prog.fee_unit || "year"}</span>
                            </div>

                            <div className="text-right">
                              <span className="font-medium text-muted-foreground">{prog.duration_value || 4} {prog.duration_unit || "Years"}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-3">
                            <Button
                              onClick={() => {
                                setSelectedUniversalTarget({
                                  type: "program",
                                  id: prog.id,
                                  title: prog.title,
                                  subtitle: `${prog.program_type_name || 'Degree Program'} • ${prog.duration_value || 4} Years`,
                                  avg_rating: 4.9,
                                  review_count: 3,
                                });
                                setUniversalFeedbackOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs font-semibold gap-1.5 hover:bg-primary hover:text-white"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                              Rate & Review Program
                            </Button>
                            <Button
                              onClick={() => handleEnrollProgramClick(prog)}
                              className="w-full font-bold text-xs gap-1.5 shadow-xs"
                              size="sm"
                            >
                              <GraduationCap className="h-4 w-4" />
                              Enroll Now
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : courses.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">No academic programs or courses listed yet.</Card>
                ) : null}
              </TabsContent>

              {/* 3. FACILITIES TAB */}
              <TabsContent value="facilities" className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Campus Infrastructure & Facilities</h2>
                  <Badge variant="outline" className="text-xs font-normal">Ratings & Student Feedback Enabled</Badge>
                </div>
                {facilities.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {facilities.map((fac: any) => {
                      const ratingVal = Number(fac.avg_rating || 4.8);
                      const reviewCnt = Number(fac.review_count || 3);
                      return (
                        <Card key={fac.id} className="p-5 shadow-2xs flex flex-col justify-between hover:border-primary/50 transition-colors">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                  <School className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-foreground text-base">{fac.title}</h3>
                                  <p className="text-xs text-muted-foreground font-medium">{fac.facility_type_name || "Campus Amenity"}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-1 rounded-md shrink-0">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span>{ratingVal.toFixed(1)}</span>
                                <span className="text-muted-foreground font-normal">({reviewCnt})</span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">{fac.description}</p>
                          </div>

                          <div className="pt-3 border-t border-border mt-4 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground font-medium">
                              ⭐ {ratingVal.toFixed(1)} / 5.0 Rating
                            </span>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUniversalTarget({
                                  type: "facility",
                                  id: fac.id,
                                  title: fac.title,
                                  subtitle: fac.facility_type_name || "Campus Infrastructure",
                                  avg_rating: ratingVal,
                                  review_count: reviewCnt,
                                });
                                setUniversalFeedbackOpen(true);
                              }}
                              className="text-xs font-semibold gap-1.5 hover:bg-primary hover:text-white"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                              Rate & Feedback
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">No facilities records listed yet.</Card>
                )}
              </TabsContent>

              {/* GALLERY TAB (IMAGES & VIDEOS) */}
              <TabsContent value="gallery" className="mt-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground flex items-center justify-between">
                  <span>Campus Photo & Video Gallery</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {galleryImages.length} Photos • {galleryVideos.length} Videos
                  </Badge>
                </h2>

                {/* Gallery Images Section */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" />
                    Photos ({galleryImages.length})
                  </h3>
                  {galleryImages.length > 0 ? (
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                      {galleryImages.map((img: any, idx: number) => (
                        <a
                          key={img.id || idx}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-video overflow-hidden rounded-xl border bg-muted shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
                        >
                          <img
                            src={img.url}
                            alt={img.title || `Gallery Image ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex items-end p-3">
                            <span className="text-xs font-semibold text-white truncate">{img.title || "View Full Image"}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center text-xs text-muted-foreground">No photos uploaded for this institution yet.</Card>
                  )}
                </div>

                {/* Gallery Videos Section */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    Videos ({galleryVideos.length})
                  </h3>
                  {galleryVideos.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {galleryVideos.map((vid: any, idx: number) => (
                        <Card key={vid.id || idx} className="p-4 space-y-3 shadow-xs">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="font-bold text-sm text-foreground truncate">{vid.title || `Video ${idx + 1}`}</h4>
                          </div>
                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs text-primary font-semibold hover:bg-muted/60 transition-colors"
                          >
                            <span className="truncate mr-2">{vid.url}</span>
                            <Play className="h-4 w-4 shrink-0 fill-primary" />
                          </a>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center text-xs text-muted-foreground">No video links uploaded for this institution yet.</Card>
                  )}
                </div>
              </TabsContent>

              {/* FACULTY & STAFF TAB */}
              <TabsContent value="faculty" className="mt-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center justify-between">
                  <span>Faculty & Teaching Staff</span>
                  <Badge variant="outline" className="text-xs font-normal">{facultyList.length} Faculty Members</Badge>
                </h2>

                {facultyList.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {facultyList.map((fac: any) => (
                      <Card key={fac.id} className="p-5 shadow-2xs space-y-3">
                        <div className="flex items-start gap-4">
                          {fac.avatar_url ? (
                            <img
                              src={fac.avatar_url}
                              alt={fac.name}
                              className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 bg-muted shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                              {fac.name ? fac.name[0]?.toUpperCase() : "T"}
                            </div>
                          )}
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-bold text-base text-foreground leading-tight truncate">{fac.name}</h3>
                            <Badge variant="secondary" className="font-semibold text-xs">
                              {fac.designation || fac.role_name || "Faculty Member"}
                            </Badge>
                            {fac.qualification && (
                              <p className="text-xs text-muted-foreground font-medium pt-0.5 truncate">
                                🎓 {fac.qualification}
                              </p>
                            )}
                          </div>
                        </div>

                        {(fac.specialization || fac.experience_years) && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/60">
                            {fac.specialization && (
                              <span className="font-medium text-foreground">
                                <span className="text-muted-foreground font-normal">Spec: </span>
                                {fac.specialization}
                              </span>
                            )}
                            {fac.experience_years && (
                              <Badge variant="outline" className="text-[10px]">
                                {fac.experience_years} Yrs Exp.
                              </Badge>
                            )}
                          </div>
                        )}

                        {fac.bio && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-2 leading-relaxed pt-1">
                            {fac.bio}
                          </p>
                        )}

                        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span>4.9 ★ (3 Ratings)</span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUniversalTarget({
                                type: "faculty",
                                id: fac.id,
                                title: fac.name,
                                subtitle: `${fac.designation || fac.role_name || 'Faculty Member'} • ${fac.qualification || 'Higher Academic Degree'}`,
                                avg_rating: 4.9,
                                review_count: 3,
                              });
                              setUniversalFeedbackOpen(true);
                            }}
                            className="text-xs font-semibold gap-1.5 hover:bg-primary hover:text-white"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            Rate & Review Faculty
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">No faculty or staff members listed for this institution yet.</Card>
                )}
              </TabsContent>

              {/* 4. PLACEMENTS TAB */}
              <TabsContent value="placements" className="mt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-foreground">3-Year Placement Performance Audit (2024 - 2026)</h2>
                  <Button
                    onClick={() => {
                      const firstPlc = placements[0] || { id: 1 };
                      setSelectedUniversalTarget({
                        type: "placement",
                        id: firstPlc.id,
                        title: `${profile.name} Placement Record`,
                        subtitle: `Highest Package: ${highPackageFormatted} • Average CTC: ${avgPackageFormatted}`,
                        avg_rating: 4.9,
                        review_count: 3,
                      });
                      setUniversalFeedbackOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold gap-1.5 hover:bg-primary hover:text-white shrink-0 self-start sm:self-auto"
                  >
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Rate & Review Campus Placements
                  </Button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="p-5 text-center bg-emerald-500/5 border-emerald-500/20">
                    <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Highest Salary Package</p>
                    <p className="text-2xl font-extrabold text-foreground mt-1">{highPackageFormatted}</p>
                  </Card>
                  <Card className="p-5 text-center bg-blue-500/5 border-blue-500/20">
                    <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Average Salary Package</p>
                    <p className="text-2xl font-extrabold text-foreground mt-1">{avgPackageFormatted}</p>
                  </Card>
                  <Card className="p-5 text-center bg-primary/5 border-primary/20">
                    <p className="text-xs font-semibold uppercase text-primary">Overall Placement %</p>
                    <p className="text-2xl font-extrabold text-foreground mt-1">{placementRateFormatted}</p>
                  </Card>
                </div>

                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Total Batch</th>
                          <th className="p-3">Placed Students</th>
                          <th className="p-3">Placement Rate</th>
                          <th className="p-3">Average CTC</th>
                          <th className="p-3">Highest CTC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {placements.map((pl: any) => (
                          <tr key={pl.id} className="hover:bg-muted/40 transition-colors">
                            <td className="p-3 font-bold text-primary">{pl.year}</td>
                            <td className="p-3 text-foreground">{pl.total_students} Students</td>
                            <td className="p-3 text-foreground font-semibold">{pl.placed_students} Placed</td>
                            <td className="p-3">
                              <Badge className="bg-emerald-600 text-white font-bold">{pl.placement_percentage}%</Badge>
                            </td>
                            <td className="p-3 font-semibold text-foreground">₹{(Number(pl.average_package) / 100000).toFixed(1)} LPA</td>
                            <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">₹{(Number(pl.highest_package) / 100000).toFixed(1)} LPA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* 5. CUT-OFF MARKS TAB */}
              <TabsContent value="cutoffs" className="mt-6 space-y-6">
                <h2 className="text-xl font-bold text-foreground">3-Year Entrance Examination Cut-off Scores</h2>

                {cutoffs.length > 0 ? (
                  <div className="space-y-6">
                    {cutoffs.map((cutoff: any) => {
                      const yearsData = Array.isArray(cutoff.ai_response) ? cutoff.ai_response : [];
                      return (
                        <Card key={cutoff.id} className="p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                            <div>
                              <h3 className="font-bold text-lg text-foreground">{cutoff.exam_name || "JEE Main Cutoff"}</h3>
                              <p className="text-xs text-muted-foreground">Course: {cutoff.program_title || "Computer Science & Engineering"}</p>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">3 Years Trend</Badge>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                              <thead className="bg-muted text-muted-foreground font-semibold">
                                <tr>
                                  <th className="p-2">Academic Year</th>
                                  <th className="p-2">Closing Rank</th>
                                  <th className="p-2">General Cutoff</th>
                                  <th className="p-2">OBC Cutoff</th>
                                  <th className="p-2">SC / ST Cutoff</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {yearsData.map((yData: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-2 font-bold text-foreground">{yData.year}</td>
                                    <td className="p-2 font-semibold text-primary">AIR {yData.closing_rank?.toLocaleString()}</td>
                                    <td className="p-2 font-bold text-foreground">{yData.general_cutoff}% / Score</td>
                                    <td className="p-2">{yData.obc_cutoff}%</td>
                                    <td className="p-2">{yData.sc_st_cutoff}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">No cutoff records found.</Card>
                )}
              </TabsContent>

              {/* 6. SCHOLARSHIPS TAB */}
              <TabsContent value="scholarships" className="mt-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Active Scholarship Schemes & Financial Assistance</h2>

                {scholarships.length > 0 ? (
                  <div className="space-y-4">
                    {scholarships.map((sch: any) => {
                      const info = sch.ai_response || {};
                      return (
                        <Card key={sch.id} className="p-6 border-l-4 border-l-primary space-y-3">
                          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            {info.title || "Academic Merit Scholarship"}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{info.overview}</p>

                          {info.eligibility && (
                            <div className="pt-2">
                              <p className="text-xs font-semibold text-foreground mb-1">Eligibility Criteria:</p>
                              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                {info.eligibility.map((el: string, idx: number) => (
                                  <li key={idx}>{el}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {info.financial_assistance && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                              🎁 Benefit: {info.financial_assistance}
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">No scholarship records listed.</Card>
                )}
              </TabsContent>

              {/* HOSTELS TAB */}
              <TabsContent value="hostels" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Campus Accommodation & Hostels ({hostels.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hostels.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {hostels.map((h: any) => (
                          <Card key={h.id} className="p-6 border bg-card/60 space-y-4 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-lg text-foreground">{h.name}</h4>
                                <Badge className="bg-primary text-primary-foreground font-semibold">
                                  {h.type} Hostel
                                </Badge>
                              </div>

                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{h.description || "Modern campus residence facility equipped with 24/7 security and comfortable living quarters."}</p>

                              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-lg border">
                                <div><span className="font-bold text-foreground">Annual Rent:</span> ₹{Number(h.annual_fee || 45000).toLocaleString("en-IN")}</div>
                                <div><span className="font-bold text-foreground">Security Deposit:</span> ₹{Number(h.security_deposit || 5000).toLocaleString("en-IN")}</div>
                                <div><span className="font-bold text-foreground">Available Beds:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{h.available_beds || 25} Beds</span></div>
                                <div><span className="font-bold text-foreground">Total Capacity:</span> {h.capacity || 100} Beds</div>
                              </div>

                              <div className="space-y-1 text-xs">
                                <p><strong className="text-foreground">Room Sharing:</strong> <span className="text-muted-foreground">{h.room_types || "Single, Double & Triple Sharing"}</span></p>
                                <p><strong className="text-foreground">Mess & Dining:</strong> <span className="text-muted-foreground">{h.mess_facility || "Four Meals Daily (Veg & Non-Veg)"}</span></p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {h.ac_available && <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">AC Available</Badge>}
                                {h.wifi_available && <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">High-Speed Wi-Fi</Badge>}
                                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">24/7 Security</Badge>
                              </div>

                              {h.rules && (
                                <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                                  📌 <strong>Rules & Curfew:</strong> {h.rules}
                                </p>
                              )}
                            </div>

                            <Button className="w-full mt-4 font-semibold" variant="outline" onClick={() => {
                              const el = document.querySelector('[data-tracker-trigger="enquiry"]');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}>
                              Enquire About Hostel Admission
                            </Button>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
                        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                        <p className="font-semibold text-base">Hostel Facilities Available On-Campus</p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                          Separate boys and girls hostels are equipped with 24/7 security, AC & Non-AC rooms, hygienic dining hall, and high-speed Wi-Fi. Contact campus administration for live seat availability.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LIBRARIES TAB */}
              <TabsContent value="libraries" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Central Library & Digital E-Resources ({libraries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {libraries.length > 0 ? (
                      <div className="space-y-6">
                        {libraries.map((lib: any) => (
                          <Card key={lib.id} className="p-6 border bg-card/60 space-y-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                              <div>
                                <h3 className="text-xl font-bold text-foreground">{lib.name}</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  Opening Hours: <strong className="text-foreground">{lib.opening_hours || "8:00 AM - 10:00 PM"}</strong>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {lib.reading_hall_available && <Badge className="bg-purple-600 text-white text-xs">Quiet Reading Hall</Badge>}
                                {lib.e_resources_access && <Badge className="bg-blue-600 text-white text-xs">24/7 E-Resource Portal</Badge>}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{lib.description || "Central academic library resource center housing thousands of textbooks, international research journals, and digital workstations."}</p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center py-2">
                              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <p className="text-lg font-bold text-primary">{Number(lib.total_books || 15000).toLocaleString("en-IN")}+</p>
                                <p className="text-xs text-muted-foreground font-medium">Physical Books</p>
                              </div>
                              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{Number(lib.digital_titles || 5000).toLocaleString("en-IN")}+</p>
                                <p className="text-xs text-muted-foreground font-medium">E-Books & Titles</p>
                              </div>
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{lib.journals_subscribed || 120}+</p>
                                <p className="text-xs text-muted-foreground font-medium">Subscribed Journals</p>
                              </div>
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{lib.seating_capacity || 250}</p>
                                <p className="text-xs text-muted-foreground font-medium">Seating Seats</p>
                              </div>
                            </div>

                            {lib.borrowing_rules && (
                              <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
                                📖 <strong>Borrowing Rules & Policy:</strong> {lib.borrowing_rules}
                              </div>
                            )}

                            {(lib.librarian_name || lib.librarian_email || lib.librarian_phone) && (
                              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span className="font-semibold text-foreground">Librarian: {lib.librarian_name || "Head Librarian"}</span>
                                <div className="flex items-center gap-3">
                                  {lib.librarian_phone && <span>📞 {lib.librarian_phone}</span>}
                                  {lib.librarian_email && <span>✉️ {lib.librarian_email}</span>}
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                        <p className="font-semibold text-base">Central Campus Library & E-Learning Center</p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                          The campus features an air-conditioned central library with 20,000+ volumes, IEEE digital journal subscriptions, online library portal access, and spacious reading halls.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Sticky Contact & Inquiry */}
          <aside className="w-full lg:sticky lg:top-24 space-y-6">
            <Card className="p-6 shadow-md border-border space-y-4">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Institution
              </h3>
              <Separator />

              <div className="space-y-3 text-sm">
                {profile.phone && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{profile.phone}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <span className="break-all font-medium text-foreground">{profile.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{locText}</span>
                </div>
                {profile.website && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Globe className="h-4 w-4 shrink-0 text-primary" />
                    <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium break-all">
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Button className="w-full font-bold shadow-md" size="lg" data-tracker-trigger="enquiry">
                  Enquire & Apply Now
                </Button>
                <Button variant="outline" className="w-full">
                  Download Campus Brochure
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                <ShieldCheck className="h-4 w-4" />
                100% Verified EduBird Partner Institute
              </div>
            </Card>

            <RightInquiryForm />
          </aside>
        </div>
      </div>

      <ProgramEnrollmentDialog
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        program={selectedEnrollProgram}
      />

      <UniversalFeedbackDialog
        open={universalFeedbackOpen}
        onOpenChange={setUniversalFeedbackOpen}
        target={selectedUniversalTarget}
      />
    </div>
  );
}
