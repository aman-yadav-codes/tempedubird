"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  Award,
  ArrowLeft,
  Download,
  FileText,
  Plus,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

type ProgramDetail = {
  id: number;
  title: string;
  institution: string;
  city: string;
  programType: string;
  duration: string;
  currentSemester: string;
  admissionNo: string;
  totalFee: string;
  feeStatus: string;
  syllabusModules: string[];
};

const MULTI_PROGRAM_LIST: ProgramDetail[] = [
  {
    id: 1,
    title: "NEET Intensive Classroom Program",
    institution: "Maa Sharda Institute PVT LTD",
    city: "Main Campus, Varanasi",
    programType: "1-Year Medical Intensive Coaching",
    duration: "1 Year",
    currentSemester: "Academic Session 2026-2027",
    admissionNo: "MS-STU-001",
    totalFee: "₹45,000 Total Course Fee",
    feeStatus: "Paid (Receipt #EDUBIRD-2026-8849)",
    syllabusModules: [
      "Module 1: Physics Mechanics, Thermodynamics & Modern Physics",
      "Module 2: Chemistry Organic Reactions, Chemical Kinetics & Inorganic",
      "Module 3: Biology Human Physiology, Genetics & Biotechnology (Current)",
      "Module 4: NEET Mock Test Series, PYQ Question Banks & Revision Drills",
    ],
  },
];

export default function StudentMyProgramPage() {
  const { accessToken } = useAuthStore();
  const [programs, setPrograms] = useState<ProgramDetail[]>(MULTI_PROGRAM_LIST);
  const [selectedId, setSelectedId] = useState<number>(1);

  const loadEnrollments = () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    fetch("/api/student/enrollments", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.enrollments) && data.enrollments.length > 0) {
          const mapped: ProgramDetail[] = data.enrollments.map((e: any, idx: number) => ({
            id: e.enrollment_id || idx + 1,
            title: e.program_title || "Enrolled Academic Program",
            institution: e.institution_name || "Partner Institution",
            city: e.institution_slug ? `${e.institution_slug.toUpperCase()} Campus` : "Main Campus",
            programType: e.program_duration || "Academic Degree / Diploma",
            duration: e.program_duration || "Academic Session",
            currentSemester: e.academic_year_name ? `Active Session (${e.academic_year_name})` : "Active Semester 2025-2026",
            admissionNo: e.admission_number || `STU-2026-${e.program_code || "ENR"}-${String(e.enrollment_id).padStart(4, "0")}`,
            totalFee: e.fee_amount ? `₹${Number(e.fee_amount).toLocaleString("en-IN")}` : "₹50,000 / Year",
            feeStatus: `Paid (Receipt #EDUBIRD-2026-${e.enrollment_id + 5000})`,
            syllabusModules: [
              "Module 1: Core Fundamentals & Introduction",
              "Module 2: Intermediate Theory & Practical Labs",
              "Module 3: Advanced Applications & Electives (Current)",
              "Module 4: Final Industry Project & Assessment",
            ],
          }));

          setPrograms(mapped);
          setSelectedId(mapped[0].id);
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadEnrollments();

    const handleUpdate = () => loadEnrollments();
    window.addEventListener("student_enrollment_updated", handleUpdate);
    return () => {
      window.removeEventListener("student_enrollment_updated", handleUpdate);
    };
  }, [accessToken]);

  const activeProgram = programs.find((p) => p.id === selectedId) || programs[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/student/dashboard" className="text-xs font-bold text-primary flex items-center gap-1 mb-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Student Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            My Enrolled Programs ({programs.length})
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            You are currently enrolled in multiple programs across different institutions. Select a program below to inspect syllabus, fee receipts, and curriculum details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/courses">
            <Button size="sm" className="font-bold text-xs gap-1.5 shadow-sm cursor-pointer">
              <Plus className="h-4 w-4" /> Enroll in Another Program
            </Button>
          </Link>
        </div>
      </div>

      {/* MULTI-PROGRAM TABS SWITCHER */}
      <div className="space-y-3">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-primary" />
          Select Enrolled Institution Program:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {programs.map((prog) => {
            const isSelected = prog.id === selectedId;
            return (
              <Card
                key={prog.id}
                onClick={() => setSelectedId(prog.id)}
                className={`p-4 cursor-pointer transition-all border-2 space-y-2 ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-border/80 hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] font-extrabold">
                    {prog.duration}
                  </Badge>
                  {isSelected && (
                    <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> Active View
                    </Badge>
                  )}
                </div>

                <h3 className="font-extrabold text-sm text-foreground leading-snug line-clamp-2">{prog.title}</h3>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 line-clamp-1">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {prog.institution}
                </p>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{prog.admissionNo}</span>
                  <span className="text-primary">{prog.currentSemester}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ACTIVE PROGRAM DETAILS */}
      <div className="grid gap-6 md:grid-cols-3 pt-2">
        {/* LEFT 2 COLUMNS: PROGRAM OVERVIEW & SYLLABUS ROADMAP */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline" className="text-xs font-bold text-primary mb-1">
                  {activeProgram.programType}
                </Badge>
                <h2 className="text-xl font-extrabold text-foreground">{activeProgram.title}</h2>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> {activeProgram.institution} • {activeProgram.city}
                </p>
              </div>

              <Badge className="bg-emerald-600 text-white font-extrabold text-xs gap-1 shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" /> Enrolled Student
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-3.5 rounded-xl bg-muted/50">
                <span className="text-muted-foreground block text-[11px]">Admission Number</span>
                <span className="font-extrabold text-foreground text-sm">{activeProgram.admissionNo}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/50">
                <span className="text-muted-foreground block text-[11px]">Current Progress</span>
                <span className="font-extrabold text-primary text-sm">{activeProgram.currentSemester}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/50">
                <span className="text-muted-foreground block text-[11px]">Annual Course Fee</span>
                <span className="font-extrabold text-foreground text-sm">{activeProgram.totalFee}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/50">
                <span className="text-muted-foreground block text-[11px]">Fee Receipt Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {activeProgram.feeStatus}
                </span>
              </div>
            </div>
          </Card>

          {/* SYLLABUS & CURRICULUM ROADMAP */}
          <Card className="p-6 shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Curriculum Roadmap & Module Breakdown
            </h2>

            <div className="space-y-3">
              {activeProgram.syllabusModules.map((mod, idx) => {
                const isCurrent = mod.includes("(Current)");
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
                      isCurrent ? "border-primary bg-primary/5 font-semibold shadow-2xs" : "bg-card"
                    }`}
                  >
                    <Badge variant={isCurrent ? "default" : "outline"} className="shrink-0 text-[10px]">
                      Module {idx + 1}
                    </Badge>
                    <span className="text-foreground">{mod}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: DOWNLOADS & ACADEMIC HELP */}
        <div className="space-y-6">
          <Card className="p-6 shadow-2xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Academic Documents
            </h3>

            <div className="space-y-2.5">
              <Link href="/notes">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs font-semibold gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5 text-primary" /> Download Course Syllabus PDF
                </Button>
              </Link>

              <Link href="/notes">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs font-semibold gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5 text-primary" /> Download Fee Receipt & ID Card
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 shadow-2xs space-y-3 bg-gradient-to-br from-slate-900 via-primary/90 to-slate-900 text-white">
            <Badge className="bg-emerald-500 text-white font-bold text-[10px]">Institution Support</Badge>
            <h3 className="font-bold text-base">{activeProgram.institution} Office</h3>
            <p className="text-xs text-white/80 leading-relaxed">
              Need assistance regarding exams, campus visits, or certificate issuance for this program?
            </p>
            <Link href="/institutes">
              <Button size="sm" className="w-full font-bold text-xs bg-white text-slate-900 hover:bg-slate-100 shadow-md cursor-pointer">
                Contact Academic Desk
              </Button>
            </Link>
          </Card>

          <Card className="p-5 border-dashed border-primary/40 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-primary">
              <Sparkles className="h-4 w-4" /> Want to Learn More Skills?
            </div>
            <p className="text-xs text-muted-foreground">
              You can enroll in additional professional certificates or full-time programs across any partner institution on EduBird.
            </p>
            <Link href="/courses">
              <Button size="sm" variant="outline" className="w-full text-xs font-bold mt-1 cursor-pointer">
                Browse Institution Courses
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
