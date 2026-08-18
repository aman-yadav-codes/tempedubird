"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  Lock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Building2,
  IndianRupee,
} from "lucide-react";
import { useAuthStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";

export interface ProgramEnrollmentTarget {
  id: number;
  title: string;
  institution_id?: number;
  institution_name?: string;
  fee_amount?: string | number;
  fee_unit?: string;
  duration?: string;
  about?: string;
}

interface ProgramEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramEnrollmentTarget | null;
}

export function ProgramEnrollmentDialog({
  open,
  onOpenChange,
  program,
}: ProgramEnrollmentDialogProps) {
  const { user, accessToken } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signup");

  // Store pending enrollment target if user needs to register/login first
  useEffect(() => {
    if (open && program && (!user || !accessToken)) {
      try {
        sessionStorage.setItem("pending_enrollment_program", JSON.stringify(program));
      } catch {
        // storage fallback
      }
    }
  }, [open, program, user, accessToken]);

  const handleOpenAuth = (tab: "signin" | "signup") => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const handleConfirmEnrollment = async () => {
    if (!program) return;
    if (!user || !accessToken) {
      handleOpenAuth("signup");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          programId: program.id,
          institutionId: program.institution_id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Session expired. Please sign in to enroll.");
          handleOpenAuth("signin");
          return;
        }
        throw new Error(json.error || "Enrollment failed");
      }

      if (json.alreadyEnrolled) {
        toast.info(json.message || "You are already enrolled in this course!");
      } else {
        toast.success(json.message || `Successfully enrolled in ${program.title}!`);
      }

      sessionStorage.removeItem("pending_enrollment_program");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("student_enrollment_updated"));
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Could not complete enrollment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!program) return null;

  const getFormattedFee = (val?: string | number) => {
    if (!val) return "Standard Fee";
    const str = String(val).trim();
    if (str.includes("₹")) return str;
    const num = Number(str.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num) && num > 0) {
      return `₹${num.toLocaleString("en-IN")}`;
    }
    return str || "Standard Fee";
  };

  const formattedFee = getFormattedFee(program.fee_amount);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border p-6 shadow-xl rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Course Enrollment Application
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit your formal application to enroll in this program.
            </DialogDescription>
          </DialogHeader>

          {/* Program Details Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 mt-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {program.duration || "Academic Program"}
                </Badge>
                <h3 className="font-bold text-base text-foreground mt-1 leading-snug">
                  {program.title}
                </h3>
              </div>
              <Badge className="bg-emerald-600 text-white font-extrabold text-xs shrink-0">
                {formattedFee} {program.fee_unit ? `/ ${program.fee_unit}` : ""}
              </Badge>
            </div>

            {program.institution_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {program.institution_name}
              </p>
            )}
          </div>

          {/* User Auth Status Decision */}
          {!user || !accessToken ? (
            <div className="space-y-4 pt-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Lock className="h-4 w-4 shrink-0" />
                  Student Account Required
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  You must be registered and logged in as a student to enroll in this course. If you don't have an account, register in 30 seconds!
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => handleOpenAuth("signup")}
                  className="w-full font-bold shadow-md gap-2"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  Register First to Enroll
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenAuth("signin")}
                  className="w-full font-semibold"
                >
                  Already Registered? Sign In
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-3">
              {/* Logged in Student Details */}
              <div className="rounded-xl border border-border p-3.5 space-y-2 bg-card text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Enrolling Student Information
                </p>
                <div className="space-y-1 pt-1 font-medium text-foreground">
                  <p className="text-sm font-bold">{user.full_name}</p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    {user.email}
                  </p>
                  {user.phone && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      {user.phone}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleConfirmEnrollment}
                disabled={submitting}
                className="w-full font-bold shadow-md gap-2"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting Enrollment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Confirm & Submit Enrollment
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Modal Trigger */}
      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={(nextOpen) => {
          setAuthModalOpen(nextOpen);
          if (!nextOpen && user && accessToken) {
            // Re-open enrollment dialog after authentication completes!
            onOpenChange(true);
          }
        }}
        defaultTab={authTab}
      />
    </>
  );
}
