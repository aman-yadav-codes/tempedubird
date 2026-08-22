"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  HelpCircle,
  User,
  Mail,
  Phone,
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Building2,
  Lock,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";

export interface CourseEnquiryTarget {
  id: number;
  title: string;
  institute?: string;
  institution_id?: number;
  price?: string;
  duration?: string;
}

interface CourseEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseEnquiryTarget | null;
}

export function CourseEnquiryDialog({
  open,
  onOpenChange,
  course,
}: CourseEnquiryDialogProps) {
  const { user, accessToken } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signup");

  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Website Course Inquiry");
  const [notes, setNotes] = useState("");

  // Store pending enquiry target if user needs to register/login first
  useEffect(() => {
    if (open && course && (!user || !accessToken)) {
      try {
        sessionStorage.setItem("pending_course_enquiry", JSON.stringify(course));
      } catch {
        // storage fallback
      }
    }
  }, [open, course, user, accessToken]);

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (user) {
      if (user.full_name) setStudentName(user.full_name);
      if (user.phone) setPhone(user.phone);
      if (user.email) setEmail(user.email);
    }
  }, [user, open]);

  // Reset form state when dialog opens with new course
  useEffect(() => {
    if (open && course) {
      setSubmitted(false);
      setNotes(`Interested in learning more about ${course.title} at ${course.institute || "this institution"}. Please share syllabus, fees, batch timings, and admission process.`);
    }
  }, [open, course]);

  if (!course) return null;

  const handleOpenAuth = (tab: "signin" | "signup") => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) {
      handleOpenAuth("signup");
      return;
    }

    if (!studentName.trim() || !phone.trim()) {
      toast.error("Please enter student name and contact phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_name: studentName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          preferred_program: course.title,
          program_id: course.id,
          institution_id: course.institution_id || 1,
          source: source,
          notes: notes.trim(),
          user_id: user?.id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit enquiry");

      setSubmitted(true);
      sessionStorage.removeItem("pending_course_enquiry");
      toast.success("Enquiry submitted successfully! Our counseling team will reach out to you shortly.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("student_enrollment_updated"));
      }
    } catch (err: any) {
      toast.error(err.message || "Error submitting course enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg bg-card border-border p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-1.5 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Course Counseling Enquiry
              </DialogTitle>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-semibold">
                Admission Desk
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit your inquiry directly to the institution counseling office.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center ring-4 ring-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-foreground text-lg">Enquiry Successfully Submitted!</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Your inquiry for <strong className="text-foreground">{course.title}</strong> has been sent to the institution. You can track updates under <strong className="text-primary">Student Portal &gt; My Enquiries</strong>.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="font-bold text-xs bg-primary text-primary-foreground px-6 py-2"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : !user || !accessToken ? (
            /* Locked state requiring student / guardian login or signup */
            <div className="space-y-4 pt-2">
              {/* Selected Course Banner */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-primary block">Target Course</span>
                  <h4 className="font-bold text-foreground truncate text-sm">{course.title}</h4>
                  {course.institute && (
                    <p className="text-muted-foreground truncate flex items-center gap-1 mt-0.5 text-[11px]">
                      <Building2 className="h-3 w-3 text-primary shrink-0" />
                      {course.institute}
                    </p>
                  )}
                </div>
                {course.price && (
                  <Badge className="bg-primary text-primary-foreground font-extrabold text-xs shrink-0">
                    {course.price}
                  </Badge>
                )}
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Lock className="h-4 w-4 shrink-0" />
                  Student / Guardian Account Required to Enquire
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To ensure quality counseling and allow you to track answers, notes, and application status in your student portal, you must be signed in with a student or guardian account.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => handleOpenAuth("signup")}
                  className="w-full font-bold shadow-md gap-2 h-11 text-xs bg-primary text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Register Free Student Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenAuth("signin")}
                  className="w-full font-bold text-xs h-10"
                >
                  Already have an account? Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitEnquiry} className="space-y-4 pt-2">
              {/* Selected Course Banner */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-primary block">Target Course Selected</span>
                  <h4 className="font-bold text-foreground truncate text-sm">{course.title}</h4>
                  {course.institute && (
                    <p className="text-muted-foreground truncate flex items-center gap-1 mt-0.5 text-[11px]">
                      <Building2 className="h-3 w-3 text-primary shrink-0" />
                      {course.institute}
                    </p>
                  )}
                </div>
                {course.price && (
                  <Badge className="bg-primary text-primary-foreground font-extrabold text-xs shrink-0">
                    {course.price}
                  </Badge>
                )}
              </div>

              {/* Verified Account Notice if logged in */}
              {user ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    Enquiring as verified student: <strong className="text-foreground font-bold">{user?.full_name || "Student"}</strong>
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold uppercase shrink-0">
                    Verified
                  </Badge>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Student Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Rahul Verma"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="bg-background text-xs h-10"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Contact Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-background text-xs h-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="applicant@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background text-xs h-10"
                  />
                </div>

                {/* Preferred Program / Class */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Selected Program</Label>
                  <Input
                    value={course.title}
                    readOnly
                    disabled
                    className="bg-muted text-xs h-10 font-bold text-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Enquiry Source */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Enquiry Type / Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="bg-background text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website Course Inquiry">Website Course Inquiry</SelectItem>
                    <SelectItem value="Online Counseling">Online Counseling Desk</SelectItem>
                    <SelectItem value="Admission Question">Admission & Fee Question</SelectItem>
                    <SelectItem value="Syllabus & Curriculum">Syllabus & Curriculum Request</SelectItem>
                    <SelectItem value="Scholarship Query">Scholarship & Discount Query</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enquiry Notes & Details */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Question / Inquiry Details</Label>
                <Textarea
                  placeholder="Enter your specific question about course schedule, fees, eligibility..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-background text-xs resize-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-xs font-semibold px-4 h-10"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10 shadow-md gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Enquiry
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authTab}
      />
    </>
  );
}
