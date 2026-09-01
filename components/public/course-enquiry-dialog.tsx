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
  institutionId?: number;
  price?: string;
  fee_amount?: string | number;
  duration?: string;
  type?: "course" | "product" | "institute" | "institution" | "teacher";
  is_product?: boolean;
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

  // Parent specific state
  const isParent = Boolean(
    user?.role_codes?.some((c) => c.toLowerCase().includes("parent") || c.toLowerCase().includes("guardian")) ||
    user?.roles?.some((r) => r.toLowerCase().includes("parent") || r.toLowerCase().includes("guardian"))
  );
  const [childrenList, setChildrenList] = useState<Array<{ student_profile_id: number; full_name: string; class_category_name?: string }>>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    if (isParent && accessToken) {
      fetch("/api/parent/children", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.children && Array.isArray(data.children)) {
            setChildrenList(data.children);
            if (data.children.length > 0) {
              setSelectedChildId(String(data.children[0].student_profile_id));
              setStudentName(data.children[0].full_name);
            }
          }
        })
        .catch(() => {});
    }
  }, [isParent, accessToken]);

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
    if (user && !isParent) {
      if (user.full_name) setStudentName(user.full_name);
      if (user.phone) setPhone(user.phone);
      if (user.email) setEmail(user.email);
    } else if (user && isParent) {
      if (user.phone) setPhone(user.phone);
      if (user.email) setEmail(user.email);
    }
  }, [user, isParent, open]);

  // Reset form state when dialog opens with new course/product
  useEffect(() => {
    if (open && course) {
      setSubmitted(false);
      const isProd = course.type === "product" || course.is_product;
      const isInst = course.type === "institute" || course.type === "institution";
      const isTeacher = course.type === "teacher";
      if (isProd) {
        setNotes(`Interested in purchasing/inquiring about ${course.title} (Price: ₹${course.fee_amount || course.price || "N/A"}). Please share availability, bulk discount, and delivery details.`);
      } else if (isInst) {
        setNotes(`Interested in admission, available courses, fee concessions, and campus facilities at ${course.title}. Please connect me with the admissions desk.`);
      } else if (isTeacher) {
        setNotes(`Interested in mentorship and learning with ${course.title}. Please share batch timings and course curriculum.`);
      } else {
        setNotes(`Interested in learning more about ${course.title} at ${course.institute || "this institution"}. Please share syllabus, fees, batch timings, and admission process.`);
      }
    }
  }, [open, course]);

  if (!course) return null;

  const isProd = course.type === "product" || course.is_product;
  const isInst = course.type === "institute" || course.type === "institution";
  const isTeacher = course.type === "teacher";

  const dialogTitle = isProd
    ? "Product Enquiry & Purchase Request"
    : isInst
    ? "Institute Admission & Counseling Enquiry"
    : isTeacher
    ? "Faculty Mentorship & Guidance Enquiry"
    : "Course Counseling & Admission Enquiry";

  const dialogBadge = isProd
    ? "Store Desk"
    : isInst
    ? "Institute Desk"
    : isTeacher
    ? "Faculty Desk"
    : "Admission Desk";

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

    const resolvedName = String(studentName || user?.full_name || "Student").trim();
    const resolvedPhone = String(phone || user?.phone || "Not provided").trim();
    const resolvedEmail = String(email || user?.email || "").trim();

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_name: resolvedName,
          phone: resolvedPhone,
          email: resolvedEmail,
          preferred_program: course.title,
          program_id: isProd ? null : (isInst ? null : course.id),
          product_id: isProd ? course.id : null,
          institution_id: course.institution_id || course.institutionId || (isInst ? course.id : null),
          source: isProd
            ? (isParent ? "Parent Portal Product Inquiry" : "Website Product Inquiry")
            : isInst
            ? (isParent ? "Parent Portal Institute Inquiry" : "Website Institute Inquiry")
            : (isParent ? "Parent Portal Course Inquiry" : (source || "Website Course Inquiry")),
          source_type: isProd ? "product" : isInst ? "own_website" : (course.institution_id || course.institutionId ? "own_website" : "edubird"),
          notes: isParent
            ? `Enquiry by Parent: ${user?.full_name || ""} (${resolvedPhone}) on behalf of child ${resolvedName}. ${notes.trim()}`
            : notes.trim(),
          user_id: user?.id || null,
          parent_name: isParent ? user?.full_name : null,
          parent_phone: isParent ? resolvedPhone : null,
          parent_email: isParent ? resolvedEmail : null,
          child_name: isParent ? resolvedName : null,
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
      toast.error(err.message || "Error submitting enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-5 pb-3.5 border-b border-border space-y-1.5 shrink-0 bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {dialogTitle}
              </DialogTitle>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-semibold">
                {dialogBadge}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit your inquiry directly to the counseling & admissions desk.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center ring-4 ring-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-foreground text-lg">Enquiry Successfully Submitted!</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Your inquiry for <strong className="text-foreground">{course.title}</strong> has been sent. You can track updates under <strong className="text-primary">Student Portal &gt; My Enquiries</strong>.
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
            ) : (
              <form onSubmit={handleSubmitEnquiry} className="space-y-4 pt-2">
                {/* Target Selected Banner */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-bold text-primary block">
                      {isProd ? "Selected Product" : isInst ? "Selected Institution" : isTeacher ? "Selected Educator" : "Selected Course"}
                    </span>
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

                {/* Auto-filled details for logged-in user or editable inputs */}
                {user ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 truncate text-foreground text-sm">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {isParent ? (
                          <span>Enquiring as Parent: <strong className="font-black">{user?.full_name || "Parent"}</strong></span>
                        ) : (
                          <span>Enquiring as student: <strong className="font-black">{user?.full_name || "Student"}</strong></span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold uppercase shrink-0">
                        {isParent ? "Parent Portal" : "Verified Account"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5 font-medium">
                      {user?.phone && <span>📞 {user.phone}</span>}
                      {user?.email && <span>✉️ {user.email}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <Label className="text-xs font-bold">Your Full Name *</Label>
                      <Input
                        required
                        placeholder="Enter your full name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="h-9 text-xs mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-bold">Email Address *</Label>
                        <Input
                          required
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Phone / WhatsApp *</Label>
                        <Input
                          required
                          type="tel"
                          placeholder="+91 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

              {/* If Parent, prompt for which child's behalf they are making enquiry */}
              {isParent && childrenList.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                    Which child&apos;s behalf are you making this enquiry for? <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedChildId}
                    onValueChange={(val) => {
                      setSelectedChildId(val);
                      const c = childrenList.find((ch) => String(ch.student_profile_id) === val);
                      if (c) setStudentName(c.full_name);
                    }}
                  >
                    <SelectTrigger className="bg-background text-xs h-10 font-bold">
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {childrenList.map((ch) => (
                        <SelectItem key={ch.student_profile_id} value={String(ch.student_profile_id)}>
                          {ch.full_name} {ch.class_category_name ? `(${ch.class_category_name})` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other / New Child</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Enquiry Notes & Details */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Question / Inquiry Details</Label>
                <Textarea
                  placeholder="Enter your specific question about course schedule, syllabus, batch timings, fees..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="bg-background text-xs resize-none"
                  required
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authTab}
        institutionId={course?.institution_id}
      />
    </>
  );
}
