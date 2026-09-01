"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  CheckSquare,
  BookMarked,
  Building2,
  Library,
  Award,
  Clock,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Download,
  Plus,
  ShieldCheck,
  Sparkles,
  FileText,
  Layers,
  CheckCircle2,
  Users,
  ShoppingBag,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EnrolledProgram = {
  id: number;
  title: string;
  institution: string;
  admissionNo: string;
  currentSemester: string;
  overallAttendance: number;
  completedCredits: number;
  totalCredits: number;
  status: string;
  category: string;
  activeSubjects: {
    id: number;
    name: string;
    code: string;
    faculty: string;
    progress: number;
    nextExam: string;
  }[];
};

const DEFAULT_MULTI_PROGRAMS: EnrolledProgram[] = [
  {
    id: 1,
    title: "NEET Intensive Classroom Program",
    institution: "Maa Sharda Institute PVT LTD",
    admissionNo: "MS-STU-001",
    currentSemester: "Academic Session 2026-2027",
    overallAttendance: 94.5,
    completedCredits: 142,
    totalCredits: 180,
    status: "Active Enrolled",
    category: "1 Year",
    activeSubjects: [
      {
        id: 1,
        name: "Physics: Mechanics & Electrodynamics",
        code: "PHY-101",
        faculty: "Prof. Rajesh Verma",
        progress: 85,
        nextExam: "24 Aug 2026",
      },
      {
        id: 2,
        name: "Chemistry: Organic & Inorganic Analysis",
        code: "CHEM-102",
        faculty: "Dr. Ananya Sharma",
        progress: 78,
        nextExam: "28 Aug 2026",
      },
      {
        id: 3,
        name: "Biology: Botany & Human Physiology",
        code: "BIO-103",
        faculty: "Dr. Vikramaditya",
        progress: 90,
        nextExam: "02 Sep 2026",
      },
    ],
  },
];

export default function StudentDashboardPage() {
  const { user, accessToken } = useAuthStore();
  const [greeting, setGreeting] = useState("Good Day");
  const [programs, setPrograms] = useState<EnrolledProgram[]>(DEFAULT_MULTI_PROGRAMS);
  const [selectedProgramId, setSelectedProgramId] = useState<number>(1);

  const loadEnrollments = () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    fetch("/api/student/enrollments", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.enrollments) && data.enrollments.length > 0) {
          const mapped: EnrolledProgram[] = data.enrollments.map((e: any, idx: number) => ({
            id: e.enrollment_id || idx + 1,
            title: e.program_title || "Enrolled Program",
            institution: e.institution_name || "Maa Sharda Institute PVT LTD",
            admissionNo: e.admission_number || `MS-STU-${String(e.enrollment_id || idx + 1).padStart(3, "0")}`,
            currentSemester: e.academic_year_name ? `Academic Session ${e.academic_year_name}` : "Academic Session 2026-2027",
            overallAttendance: 92.5 + (idx % 3),
            completedCredits: 40 + idx * 30,
            totalCredits: 120,
            status: e.status ? `Active (${e.status})` : "Active Enrolled",
            category: e.program_duration || "1 Year",
            activeSubjects: [
              {
                id: 10 + idx,
                name: `${e.program_title} Core Module ${idx + 1}`,
                code: e.program_code || `PRG-${e.program_id || idx + 1}`,
                faculty: "Senior Faculty",
                progress: 75 + (idx * 5) % 20,
                nextExam: "28 Aug 2026",
              },
            ],
          }));

          setPrograms(mapped);
          setSelectedProgramId(mapped[0].id);
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    loadEnrollments();

    const handleUpdate = () => loadEnrollments();
    window.addEventListener("student_enrollment_updated", handleUpdate);
    return () => {
      window.removeEventListener("student_enrollment_updated", handleUpdate);
    };
  }, [accessToken]);

  const activeProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];
  const distinctInstitutionsCount = new Set(programs.map((p) => p.institution)).size;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* WELCOME & MULTI-PROGRAM SUMMARY BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-rose-900/30">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500 text-white font-extrabold text-xs gap-1 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {programs.length === 1
                    ? `Enrolled in ${programs[0].institution}`
                    : `Enrolled in ${programs.length} Programs Across ${distinctInstitutionsCount} Institutions`}
                </Badge>
                {activeProgram?.admissionNo && (
                  <span className="text-xs font-semibold text-white/80">{activeProgram.admissionNo}</span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {greeting}, {user?.full_name || "Student"}! 👋
              </h1>

              <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                {programs.length === 1
                  ? `You are enrolled in ${programs[0].title} at ${programs[0].institution}. Access your classes, results, and study resources below.`
                  : "Currently managing multiple academic programs simultaneously. Select a program below to view details or enroll in new courses."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/courses">
                <Button size="lg" className="font-bold text-xs gap-2 bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer border border-white/20">
                  <Plus className="h-4 w-4" />
                  Enroll in Another Program
                </Button>
              </Link>
              <Link href="/student/my-program">
                <Button size="lg" variant="secondary" className="font-bold text-xs gap-2 bg-white text-slate-900 hover:bg-slate-100 shadow-md cursor-pointer">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  View All Enrolled Programs ({programs.length})
                </Button>
              </Link>
            </div>
          </div>

          {/* MULTI-PROGRAM SELECTOR TABS CAROUSEL */}
          <div className="pt-4 border-t border-white/15 space-y-2">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Switch Active Program View:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {programs.map((prog) => {
                const isSelected = prog.id === selectedProgramId;
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => setSelectedProgramId(prog.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-primary"
                        : "bg-white/10 text-white border-white/15 hover:bg-white/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-extrabold ${
                            isSelected ? "bg-primary/10 text-primary" : "bg-white/20 text-white"
                          }`}
                        >
                          {prog.category}
                        </Badge>
                        {isSelected && (
                          <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Selected View
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-extrabold text-xs leading-snug line-clamp-2 mt-1">{prog.title}</h3>
                      <p className={`text-[10px] font-medium line-clamp-1 ${isSelected ? "text-slate-600" : "text-white/70"}`}>
                        {prog.institution}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-semibold">
                      <span>{prog.admissionNo}</span>
                      <span>{prog.overallAttendance}% Att.</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* ACADEMIC METRICS FOR SELECTED PROGRAM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Performance & Metrics for: <span className="text-primary">{activeProgram.title}</span>
          </h2>
          <Badge variant="outline" className="text-xs font-bold text-muted-foreground">
            {activeProgram.institution}
          </Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 shadow-2xs border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Attendance Rate</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">{activeProgram.overallAttendance}%</p>
            <span className="text-[10px] text-muted-foreground font-medium">Eligible for End-Sem Exams</span>
          </Card>

          <Card className="p-4 shadow-2xs border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Degree Credits</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">
              {activeProgram.completedCredits} <span className="text-xs font-normal text-muted-foreground">/ {activeProgram.totalCredits}</span>
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">Progress Completed</span>
          </Card>

          <Card className="p-4 shadow-2xs border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Practice Tests</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <CheckSquare className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">12 Completed</p>
            <span className="text-[10px] text-muted-foreground font-medium">Speed Quizzes & Tests</span>
          </Card>

          <Card className="p-4 shadow-2xs border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Lecture Notes</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <BookMarked className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">18 PDFs Saved</p>
            <span className="text-[10px] text-muted-foreground font-medium">Downloaded Faculty Notes</span>
          </Card>
        </div>
      </div>

      {/* ACTIVE SUBJECTS FOR SELECTED PROGRAM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Subjects & Modules ({activeProgram.currentSemester})</h2>
            <p className="text-xs text-muted-foreground">Track syllabus completion, next examination dates, and faculty details.</p>
          </div>
          <Link href="/notes">
            <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5 text-primary" /> Download All Notes
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {activeProgram.activeSubjects.map((sub) => (
            <Card key={sub.id} className="p-5 shadow-2xs space-y-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="secondary" className="text-[10px] font-bold mb-1">
                    {sub.code}
                  </Badge>
                  <h3 className="font-bold text-base text-foreground leading-tight">{sub.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                    <UserCheck className="h-3.5 w-3.5 text-primary" /> Faculty: {sub.faculty}
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold shrink-0">
                  <Clock className="h-3 w-3 mr-1" /> Exam: {sub.nextExam}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Syllabus Covered</span>
                  <span className="text-foreground">{sub.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${sub.progress}%` }} />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <Link href="/notes">
                  <Button size="sm" variant="ghost" className="text-xs font-bold gap-1 text-primary p-0 h-auto hover:bg-transparent cursor-pointer">
                    <FileText className="h-3.5 w-3.5" /> Notes & Handouts
                  </Button>
                </Link>

                <Link href="/practice">
                  <Button size="sm" variant="outline" className="text-xs font-bold gap-1 cursor-pointer">
                    <CheckSquare className="h-3.5 w-3.5" /> Practice Quiz
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* QUICK STUDENT ACTION CARDS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-foreground">Academic & Learning Quick Services</h2>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link href="/practice">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit group-hover:scale-110 transition-transform">
                <CheckSquare className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Practice Tests</h3>
              <p className="text-xs text-muted-foreground">Attempt timed competitive mock series, speed quizzes & live tests.</p>
            </Card>
          </Link>

          <Link href="/notes">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit group-hover:scale-110 transition-transform">
                <BookMarked className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Lecture Notes</h3>
              <p className="text-xs text-muted-foreground">Download PDF lecture handouts & handwritten formula revision sheets.</p>
            </Card>
          </Link>

          <Link href="/courses">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Explore Courses</h3>
              <p className="text-xs text-muted-foreground">Browse academic degree programs, certifications, and career tracks.</p>
            </Card>
          </Link>

          <Link href="/student/products">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group bg-primary/5 border-primary/20">
              <div className="p-3 rounded-2xl bg-primary/15 text-primary w-fit group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Recommended Products</h3>
                <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 text-primary border-primary/20">
                  Curated
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Study kits, solved paper sets, uniform kits & gadgets tailored for your course.</p>
            </Card>
          </Link>

          <Link href="/student/search-history">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit group-hover:scale-110 transition-transform">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Search History</h3>
              <p className="text-xs text-muted-foreground">View your search queries, review visited materials, and re-run previous searches.</p>
            </Card>
          </Link>

          <Link href="/institutes">
            <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Top Institutes</h3>
              <p className="text-xs text-muted-foreground">Discover verified colleges, partner academies, and campus facilities.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

