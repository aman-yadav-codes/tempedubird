"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Star,
  Award,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  IndianRupee,
  Calendar,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type StaffPerformanceRecord = {
  employee_id: number;
  full_name: string;
  role_name: string;
  designation_title?: string | null;
  tasks_assigned_count: number;
  tasks_completed_count: number;
  task_completion_rate: number;
  tasks_total_hours_logged: number;
  time_efficiency_pct: number;
  total_working_days: number;
  present_days: number;
  attendance_rate: number;
  punctuality_rate: number;
  total_score_pct: number;
  rating_score: number;
  grade: string;
  grade_label: string;
  performance_rating: string;
  evaluation_remarks?: string;
  sales_count?: number;
  total_sales_revenue?: number;
  total_commission_earned?: number;
};

type StaffPerformanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string; email?: string } | null;
  accessToken: string | null;
};

export function StaffPerformanceDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
}: StaffPerformanceDialogProps) {
  const { activeInstitutionId } = useActiveInstitution();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<StaffPerformanceRecord | null>(null);

  useEffect(() => {
    if (!open || !staffUser || !accessToken) return;

    let isMounted = true;
    setLoading(true);

    const loadPerformance = async () => {
      try {
        const instQuery = activeInstitutionId ? `&institutionId=${activeInstitutionId}` : "";
        const res = await fetch(
          `/api/admin/staff/performance?staffUserId=${staffUser.id}${instQuery}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const json = await res.json();
        if (isMounted && res.ok && Array.isArray(json.records)) {
          const matching = json.records.find((r: any) => r.employee_id === staffUser.id) || json.records[0] || null;
          setRecord(matching);
        }
      } catch (err) {
        console.error("Failed to load staff performance:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPerformance();

    return () => {
      isMounted = false;
    };
  }, [open, staffUser, accessToken, activeInstitutionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Performance: {staffUser?.full_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Employee productivity score, KPIs, tasks execution, and evaluations
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
            <p className="text-xs text-muted-foreground font-medium">Calculating performance metrics...</p>
          </div>
        ) : !record ? (
          <div className="py-12 text-center space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No Performance History Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Performance statistics will automatically generate as attendance and tasks are completed for this employee.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
            {/* Top Score Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-purple-500/10 via-primary/5 to-transparent">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Overall Evaluation
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    {record.total_score_pct || 0}%
                  </span>
                  <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs">
                    {record.grade || "Grade A"} • {record.grade_label || "Good"}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-500" />
                  <span className="text-base font-bold">{Number(record.rating_score || 5).toFixed(1)} / 5.0</span>
                </div>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {record.performance_rating?.replace(/_/g, " ") || "On Target"}
                </span>
              </div>
            </div>

            {/* Pillar Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Task Metrics */}
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    Task Completion
                  </span>
                  <span className="text-xs font-bold text-primary">{record.task_completion_rate || 0}%</span>
                </div>
                <Progress value={record.task_completion_rate || 0} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Assigned</span>
                    <span className="font-bold text-foreground">{record.tasks_assigned_count || 0}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Completed</span>
                    <span className="font-bold text-emerald-600">{record.tasks_completed_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Attendance & Punctuality */}
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Attendance & Punctuality
                  </span>
                  <span className="text-xs font-bold text-emerald-600">{record.attendance_rate || 0}%</span>
                </div>
                <Progress value={record.attendance_rate || 0} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Punctuality</span>
                    <span className="font-bold text-foreground">{record.punctuality_rate || 0}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Present Days</span>
                    <span className="font-bold text-emerald-600">{record.present_days || 0} / {record.total_working_days || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales & Admissions (if applicable) */}
            {(record.sales_count ?? 0) > 0 || (record.total_sales_revenue ?? 0) > 0 ? (
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-2.5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                  Sales & Admission Growth
                </h4>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Admissions</span>
                    <span className="text-sm font-bold text-foreground">{record.sales_count || 0}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Revenue</span>
                    <span className="text-sm font-bold text-foreground">₹{Number(record.total_sales_revenue || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Commission</span>
                    <span className="text-sm font-bold text-emerald-600">₹{Number(record.total_commission_earned || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Evaluation Remarks */}
            {record.evaluation_remarks && (
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-1 text-xs">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Evaluation Notes</span>
                <p className="text-muted-foreground leading-relaxed">{record.evaluation_remarks}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
