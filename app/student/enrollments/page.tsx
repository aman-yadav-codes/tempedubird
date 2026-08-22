"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  Clock,
  IndianRupee,
  Layers,
  ArrowRight,
  RefreshCw,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type EnrolledProgram = {
  enrollment_id: number;
  student_id: number;
  institution_id: number;
  institution_name: string;
  institution_slug?: string;
  program_id: number;
  program_title: string;
  program_code?: string;
  program_duration?: string;
  fee_amount?: string | number;
  academic_year_name?: string;
  status: string;
  admission_date?: string;
  created_at: string;
  admission_number?: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active Enrollment", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  pending: { label: "Pending Review", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

import { useAuthStore } from "@/store";

export default function StudentEnrollmentsPage() {
  const { accessToken } = useAuthStore();
  const [enrollments, setEnrollments] = useState<EnrolledProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();

    const handleUpdate = () => fetchEnrollments();
    window.addEventListener("student_enrollment_updated", handleUpdate);
    return () => {
      window.removeEventListener("student_enrollment_updated", handleUpdate);
    };
  }, [accessToken]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const res = await fetch("/api/student/enrollments", { headers });
      const json = await res.json();
      if (res.ok) {
        setEnrollments(json.enrollments || []);
      } else {
        toast.error(json.error || "Failed to load enrollments");
      }
    } catch (err) {
      toast.error("Error loading your course enrollments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Student Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My Enrolled Programs & Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all courses and academic programs you are currently enrolled in at partner institutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchEnrollments} variant="outline" size="sm" className="font-bold gap-2 text-xs h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Link href="/courses">
            <Button size="sm" className="font-bold gap-2 text-xs h-9 bg-primary text-primary-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Browse More Courses</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Enrolled Courses List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading your program enrollments...</span>
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-4">
          <GraduationCap className="h-12 w-12 mx-auto opacity-30 text-primary" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">No Enrolled Programs Found</h3>
            <p className="text-xs max-w-md mx-auto">
              You haven't enrolled in any academic programs yet. Browse our catalog and click "Enroll Now" on any course to start learning!
            </p>
          </div>
          <Link href="/courses">
            <Button className="font-bold text-xs bg-primary text-primary-foreground px-6 mt-2">
              Explore Courses & Enroll
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {enrollments.length} {enrollments.length === 1 ? "Program Enrolled" : "Programs Enrolled"}
            </span>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {enrollments.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status?.toLowerCase()] || {
                label: item.status || "Active",
                color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
              };

              const formattedFee = item.fee_amount
                ? `₹${Number(String(item.fee_amount).replace(/[^0-9.]/g, "") || 25000).toLocaleString("en-IN")}`
                : "Standard Fee";

              return (
                <Card key={item.enrollment_id} className="p-5 shadow-xs hover:border-primary/40 transition-all bg-card border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] font-bold ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                        {item.admission_number && (
                          <Badge variant="secondary" className="text-[11px] font-bold font-mono">
                            {item.admission_number}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          Enrolled on {new Date(item.created_at || item.admission_date || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-foreground leading-snug">
                        {item.program_title}
                      </h3>

                      {item.institution_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-semibold">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {item.institution_name}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Duration / Type</span>
                          <span className="font-bold text-foreground block">{item.program_duration || "Academic Session"}</span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Course Fee</span>
                          <span className="font-extrabold text-emerald-600 block text-sm">{formattedFee}</span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Academic Year</span>
                          <span className="font-bold text-foreground block">{item.academic_year_name || "2025-2026 Session"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      <Link href="/student/my-program">
                        <Button size="sm" className="text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs">
                          <span>View Course Syllabus</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
