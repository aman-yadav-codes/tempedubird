"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  IndianRupee,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuthStore } from "@/store";
import type { AdminUserDetails } from "@/lib/queries/user";
import { UserProfileContent } from "@/app/admin/users/user-profile-sheet";
import { EducationCard } from "@/app/admin/users/_components/education-card";
import { ExperienceCard } from "@/app/admin/users/_components/experience-card";
import { CertificationCard } from "@/app/admin/users/_components/certification-card";
import { FieldError } from "@/app/admin/users/_components/field-error";
import { FormSection } from "@/app/admin/users/_components/form-section";
import { ImageUploader } from "@/components/shared/image-uploader";
import { GoogleLocationPicker } from "@/components/shared/google-location-picker";
import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";

import {
  blankCertification,
  blankEducation,
  blankExperience,
  blankSalaryComponent,
  blankUserDocument,
  getInitialForm,
  hasAnyValue,
  normalizeEmail,
  normalizeNullableText,
  normalizeText,
  safeTrim,
} from "@/lib/utils/user-form.helpers";
import { NO_GENDER } from "@/lib/utils/user-form.constants";
import type { AddUserForm, EducationForm, ExperienceForm, CertificationForm, UserDocumentForm } from "@/app/admin/users/_components/types";


function formatDisplayDate(dateVal: string | null | undefined): string {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

export default function AccountPage() {
  const { accessToken, updateUser: updateAuthUser } = useAuthStore();
  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"view" | "edit">("view");

  // Form State
  const [form, setForm] = useState<AddUserForm>(getInitialForm(null));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password Modal
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchAccount = useCallback(async () => {
    if (!accessToken) return;

    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/account", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load account profile");
      }

      const userData = json.data as AdminUserDetails;
      setUser(userData);
      setForm(getInitialForm(userData));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load account profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!safeTrim(form.full_name)) {
      nextErrors.full_name = "Full name is required.";
    }
    if (!safeTrim(form.email)) {
      nextErrors.email = "Email is required.";
    }
    if (form.phone && safeTrim(form.phone).length > 0 && safeTrim(form.phone).length !== 10) {
      nextErrors.phone = "Phone number must be 10 digits.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Salary Calculations
  const grossSalary = useMemo(() => {
    return form.salary_components
      .filter((c) => c.type !== "DEDUCTION")
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [form.salary_components]);

  const totalDeductions = useMemo(() => {
    return form.salary_components
      .filter((c) => c.type === "DEDUCTION")
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [form.salary_components]);

  const netTakeHome = useMemo(() => {
    return Math.max(0, grossSalary - totalDeductions);
  }, [grossSalary, totalDeductions]);

  const handleSaveProfile = async () => {
    if (!accessToken) return;
    if (!validateForm()) {
      toast.error("Please resolve highlighted validation errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const compactExperiences = form.experiences.filter(
        (exp) => exp.job_title && (exp.company_name || exp.from_year)
      );
      const compactEducation = form.education.filter(
        (edu) => edu.qualification && (edu.institution_name || edu.from_year)
      );
      const compactCertifications = form.certifications.filter((cert) => cert.name);

      const payload = {
        full_name: normalizeText(form.full_name),
        email: normalizeEmail(form.email),
        phone: safeTrim(form.phone),
        avatar_url: normalizeNullableText(form.avatar_url),
        role_id: form.role_id ? Number(form.role_id) : (user?.role_id ?? null),
        is_active: form.is_active,
        is_verified: form.is_verified,
        is_profile_complete: form.is_profile_complete,
        profile: {
          about: normalizeNullableText(form.about),
          gender: form.gender === NO_GENDER ? null : form.gender,
          hourly_charges: form.hourly_charges ? Number(form.hourly_charges) : null,
          is_teacher: form.is_teacher,
          teacher_type: form.teacher_type || null,
          under_institution_id: form.under_institution_id ? Number(form.under_institution_id) : null,
          designation_id: form.designation_id ? Number(form.designation_id) : null,
          institution_ids: form.institution_ids.map(Number),
          joining_date: form.joining_date || null,
          date_of_birth: form.date_of_birth || null,
          shift_timing: form.shift_timing || null,
          employment_status: form.employment_status || null,
        },
        location: form.location && hasAnyValue([
          form.location.area,
          form.location.city,
          form.location.state,
          form.location.country,
          form.full_address,
        ])
          ? {
              area: normalizeText(form.location.area),
              city: normalizeText(form.location.city),
              state: normalizeText(form.location.state),
              country: normalizeText(form.location.country),
              pincode: normalizeNullableText(form.location.pincode),
              full_address: normalizeNullableText(form.full_address || form.location.formatted_address),
              formatted_address: normalizeNullableText(form.location.formatted_address || form.full_address),
              latitude: form.location.latitude ? Number(form.location.latitude) : null,
              longitude: form.location.longitude ? Number(form.location.longitude) : null,
              place_id: normalizeNullableText(form.location.place_id),
            }
          : null,
        experiences: compactExperiences.map((exp) => ({
          job_title: normalizeText(exp.job_title),
          company_name: normalizeNullableText(exp.company_name),
          from_month: Number(exp.from_month),
          from_year: Number(exp.from_year),
          to_month: exp.is_current ? null : Number(exp.to_month),
          to_year: exp.is_current ? null : Number(exp.to_year),
          is_current: exp.is_current,
        })),
        education: compactEducation.map((edu) => ({
          qualification: normalizeText(edu.qualification),
          institution_id: edu.institution_id ? Number(edu.institution_id) : null,
          from_year: Number(edu.from_year),
          to_year: Number(edu.to_year),
        })),
        certifications: compactCertifications.map((cert) => ({
          name: normalizeText(cert.name),
          issued_authority: normalizeNullableText(cert.issued_authority),
          duration: normalizeNullableText(cert.duration),
        })),
        documents: form.documents
          .filter((doc) => doc.document_type && doc.file_url)
          .map((doc) => ({
            document_type: doc.document_type,
            document_number: normalizeNullableText(doc.document_number),
            file_url: doc.file_url,
            public_id: doc.public_id || null,
            resource_type: doc.resource_type || null,
          })),
        salary_frequency: form.salary_frequency || "MONTHLY",
        salary_notes: form.salary_notes || "",
        salary_components: form.salary_components
          .filter((c) => c.label && parseFloat(c.amount) > 0)
          .map((c) => ({
            label: normalizeText(c.label),
            amount: parseFloat(c.amount) || 0,
            type: c.type || "EARNING",
          })),
        salary_account: form.salary_account
          ? {
              payment_mode: form.salary_account.payment_mode || "BANK_TRANSFER",
              bank_name: normalizeNullableText(form.salary_account.bank_name),
              account_holder_name: normalizeNullableText(form.salary_account.account_holder_name),
              account_number: normalizeNullableText(form.salary_account.account_number),
              ifsc_code: normalizeNullableText(form.salary_account.ifsc_code),
              branch_name: normalizeNullableText(form.salary_account.branch_name),
              account_type: form.salary_account.account_type || "SALARY",
              upi_id: normalizeNullableText(form.salary_account.upi_id),
              pan_number: normalizeNullableText(form.salary_account.pan_number),
              uan_number: normalizeNullableText(form.salary_account.uan_number),
              esi_number: normalizeNullableText(form.salary_account.esi_number),
            }
          : null,
      };

      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        const issuesText = json.issues
          ? Object.entries(json.issues as Record<string, string[]>)
              .map(([key, msgs]) => `${key}: ${msgs.join(", ")}`)
              .join("; ")
          : "";
        throw new Error(issuesText ? `${json.error || "Validation failed"} (${issuesText})` : json.error || "Failed to update profile records");
      }

      toast.success("All staff profile records updated successfully!");
      const updatedUser = json.data as AdminUserDetails;
      setUser(updatedUser);
      setForm(getInitialForm(updatedUser));
      setActiveView("view");

      // Update global auth store
      updateAuthUser({
        full_name: updatedUser.full_name,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile records");
    } finally {
      setSaving(false);
    }
  };

  const resetPasswordForm = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const updatePassword = async () => {
    if (!accessToken) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(String(json.error || "Failed to update password"));
      }

      toast.success("Password updated successfully");
      resetPasswordForm();
      setPasswordDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const primaryRole = user?.roles[0] ?? "Staff Member";
  const userInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  // Effective Profile Variables for View Profile
  const effectiveEmploymentStatus = form.employment_status || (user?.profile as any)?.employment_status || "Active";
  const effectiveInstitutionName = form.under_institution_name || user?.profile?.under_institution_name || user?.institutions?.[0]?.name || "Maa sharda 2";
  const effectiveDesignation = form.designation_name || user?.profile?.designation_name || primaryRole;
  const effectiveShiftTiming = form.shift_timing || (user?.profile as any)?.shift_timing || "09:00 AM - 05:00 PM (General Shift)";
  const effectiveJoiningDate = form.joining_date || (user?.profile as any)?.joining_date;
  const effectiveDateOfBirth = form.date_of_birth || (user?.profile as any)?.date_of_birth;
  const effectiveGender = form.gender && form.gender !== NO_GENDER ? form.gender : (user?.profile?.gender || "-");
  const effectiveHourlyCharges = form.hourly_charges || user?.profile?.hourly_charges || "0";
  const effectiveAbout = form.about || user?.profile?.about;
  const effectiveLocation = form.location || user?.location;
  const effectiveEducation = form.education && form.education.length > 0 && form.education[0].qualification
    ? form.education
    : (user?.education || []);
  const effectiveExperiences = form.experiences && form.experiences.length > 0 && form.experiences[0].job_title
    ? form.experiences
    : (user?.experiences || []);
  const effectiveCertifications = form.certifications && form.certifications.length > 0 && form.certifications[0].name
    ? form.certifications
    : (user?.certifications || []);
  const effectiveDocuments = form.documents && form.documents.length > 0 && (form.documents[0].file_url || form.documents[0].document_type)
    ? form.documents
    : (user?.documents || []);
  const effectiveSalaryComponents = form.salary_components && form.salary_components.length > 0
    ? form.salary_components
    : (user?.salary_components || []);
  const effectiveSalaryAccount = form.salary_account || (user?.profile as any) || {};
  const effectiveSalaryFrequency = form.salary_frequency || (user?.profile as any)?.salary_frequency || "MONTHLY";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header Profile Hero Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="size-20 border-2 border-primary/20 shadow-md">
              <AvatarImage src={user?.avatar_url || ""} alt={user?.full_name} />
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {user?.full_name}
                </h1>
                <Badge variant="secondary" className="font-semibold">
                  {primaryRole}
                </Badge>
                {user?.is_active && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                    <UserCheck className="mr-1 size-3" /> Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.phone && (
                <p className="text-xs text-muted-foreground font-mono">📱 {user.phone}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="mr-2 size-4 text-amber-600" />
              Password
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Switch: View vs Edit */}
      {activeView === "view" ? (
        <div className="space-y-6">
          {/* Section 1: Employment & Job Overview */}
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Briefcase className="size-4 text-primary" />
                  Employment & Schedule
                </CardTitle>
                <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider capitalize">
                  {effectiveEmploymentStatus.toLowerCase().replace("_", " ")}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Official role, campus assignment, schedule, and institutional position
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Institution / Campus</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{effectiveInstitutionName}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Designation</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{effectiveDesignation}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Shift Timing</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{effectiveShiftTiming}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Joining Date</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{formatDisplayDate(effectiveJoiningDate)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Date of Birth</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{formatDisplayDate(effectiveDateOfBirth)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Gender</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5 capitalize">{effectiveGender}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Hourly Charges</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5 font-mono">₹{effectiveHourlyCharges} / hr</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border">
                  <span className="text-muted-foreground text-[11px] font-medium block">Profile Status</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Verified & Active
                  </p>
                </div>
              </div>

              {effectiveAbout && (
                <div className="mt-4 p-4 rounded-xl bg-muted/10 border text-xs">
                  <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider block mb-1">
                    Professional Biography
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">{effectiveAbout}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Location & Address */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <MapPin className="size-4 text-emerald-600" />
                Location & Residential Address
              </CardTitle>
              <CardDescription className="text-xs">
                Verified address, city, state, postal code, and mapped coordinates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="p-4 rounded-xl bg-muted/20 border space-y-3">
                <div>
                  <span className="text-muted-foreground text-[11px] font-medium block">Full Address</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {effectiveLocation?.formatted_address || effectiveLocation?.full_address || form.full_address || "No address provided"}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Area / Locality</span>
                    <span className="font-medium text-foreground">{effectiveLocation?.area || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">City</span>
                    <span className="font-medium text-foreground">{effectiveLocation?.city || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">State</span>
                    <span className="font-medium text-foreground">{effectiveLocation?.state || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Pincode</span>
                    <span className="font-mono font-medium text-foreground">{effectiveLocation?.pincode || "-"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 & 4: Education & Experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education Card */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <GraduationCap className="size-4 text-purple-600" />
                  Educational Qualifications
                </CardTitle>
                <CardDescription className="text-xs">Academic degrees, diplomas, and institutions</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {effectiveEducation.length > 0 ? (
                  effectiveEducation.map((edu: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-sm">{edu.qualification}</h4>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {edu.from_year} – {edu.to_year || "Present"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{edu.institution_name || "Institution not specified"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-4 text-center">No educational qualifications added yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Experience Card */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <BriefcaseBusiness className="size-4 text-amber-600" />
                  Work & Teaching Experience
                </CardTitle>
                <CardDescription className="text-xs">Professional employment history and roles</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {effectiveExperiences.length > 0 ? (
                  effectiveExperiences.map((exp: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-sm">{exp.job_title}</h4>
                        <Badge variant={exp.is_current ? "default" : "secondary"} className="text-[11px] font-mono">
                          {exp.from_year} – {exp.is_current ? "Present" : (exp.to_year || "-")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{exp.company_name || "Organization not specified"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-4 text-center">No prior work experience recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 5: Certifications & Verification Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certifications Card */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Award className="size-4 text-teal-600" />
                  Professional Certifications
                </CardTitle>
                <CardDescription className="text-xs">Accreditations, courses, and honors</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {effectiveCertifications.length > 0 ? (
                  effectiveCertifications.map((cert: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-sm">{cert.name}</h4>
                        {cert.duration && (
                          <Badge variant="outline" className="text-[10px]">{cert.duration}</Badge>
                        )}
                      </div>
                      {cert.issued_authority && (
                        <p className="text-xs text-muted-foreground">Authority: {cert.issued_authority}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-4 text-center">No certifications recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Documents Card */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="size-4 text-blue-600" />
                  Uploaded Verification Documents
                </CardTitle>
                <CardDescription className="text-xs">Official IDs and documents uploaded for compliance</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {effectiveDocuments.length > 0 ? (
                  effectiveDocuments.map((doc: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {doc.document_type || "DOCUMENT"}
                          </Badge>
                          {doc.document_number && (
                            <span className="text-xs font-mono text-muted-foreground">{doc.document_number}</span>
                          )}
                        </div>
                      </div>
                      {doc.file_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 text-xs gap-1.5"
                        >
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3" /> View File
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">No File</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-4 text-center">No documents uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 6 & 7: Salary & Banking Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <IndianRupee className="size-4 text-rose-600" />
                  Salary & Compensation
                </CardTitle>
                <CardDescription className="text-xs">Remuneration structure, allowances, and take-home pay</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Salary Cycle</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5 block">{effectiveSalaryFrequency}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-medium">Gross Salary</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm font-mono mt-0.5 block">
                      ₹{grossSalary.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-blue-700 dark:text-blue-400 block text-[11px] font-medium">Net Take-Home</span>
                    <span className="font-bold text-blue-800 dark:text-blue-300 text-sm font-mono mt-0.5 block">
                      ₹{netTakeHome.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {effectiveSalaryComponents.length > 0 ? (
                  <div className="pt-2 border-t space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Allowances & Deductions
                    </span>
                    {effectiveSalaryComponents.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className={`font-mono font-medium ${c.type === "DEDUCTION" ? "text-rose-600" : "text-emerald-600"}`}>
                          {c.type === "DEDUCTION" ? "-" : "+"}₹{parseFloat(c.amount || "0").toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs pt-2">No individual salary components configured.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Landmark className="size-4 text-sky-600" />
                  Banking & Statutory Records
                </CardTitle>
                <CardDescription className="text-xs">Direct deposit credentials and statutory tax identifiers</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Bank Name</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.bank_name || "State Bank of India"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Account Number</span>
                    <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.account_number || "XXXX-XXXX-4892"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">IFSC Code</span>
                    <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.ifsc_code || "SBIN0001234"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Branch Name</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.branch_name || "Main Branch"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">PAN Card</span>
                    <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.pan_number || "ABCDE1234F"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">UAN (PF)</span>
                    <span className="font-mono font-semibold text-foreground text-xs mt-0.5 block">
                      {effectiveSalaryAccount.uan_number || "-"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-muted-foreground">
                  <span>Payment Mode: <strong className="text-foreground font-medium">{effectiveSalaryAccount.payment_mode || "BANK_TRANSFER"}</strong></span>
                  <span>ESI No: <strong className="font-mono text-foreground font-medium">{effectiveSalaryAccount.esi_number || "-"}</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="shadow-sm rounded-2xl border">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Edit3 className="size-5 text-primary" /> Modify Profile Records
                </CardTitle>
                <CardDescription>
                  Update your personal info, employment, location, education, experience, compensation, and statutory records.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="font-semibold shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" /> Save All Changes
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <Tabs defaultValue="basic" className="space-y-6">
              {/* Comprehensive Staff Tabs List */}
              <TabsList className="flex flex-wrap w-full items-center justify-start gap-1.5 p-1.5 bg-muted/60 rounded-xl border border-border/50 min-h-11">
                <TabsTrigger value="basic" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <User className="mr-1.5 size-3.5 text-primary" /> Personal Info
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <Briefcase className="mr-1.5 size-3.5 text-blue-500" /> Employment & Job
                </TabsTrigger>
                <TabsTrigger value="location" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <MapPin className="mr-1.5 size-3.5 text-emerald-500" /> Location
                </TabsTrigger>
                <TabsTrigger value="education" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <GraduationCap className="mr-1.5 size-3.5 text-purple-500" /> Education
                </TabsTrigger>
                <TabsTrigger value="experience" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <BriefcaseBusiness className="mr-1.5 size-3.5 text-amber-500" /> Experience
                </TabsTrigger>
                <TabsTrigger value="certifications" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <Award className="mr-1.5 size-3.5 text-teal-500" /> Docs & Certs
                </TabsTrigger>
                <TabsTrigger value="salary" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <IndianRupee className="mr-1.5 size-3.5 text-rose-500" /> Salary & Pay
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <CreditCard className="mr-1.5 size-3.5 text-sky-500" /> Banking & Statutory
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Personal Info */}
              <TabsContent value="basic" className="space-y-6 pt-2">
                <FormSection title="Avatar & Photo">
                  <div className="flex items-center gap-6">
                    <ImageUploader
                      value={form.avatar_url}
                      onChange={(url) => setForm((prev) => ({ ...prev, avatar_url: url }))}
                      accessToken={accessToken}
                      label="Profile Picture"
                      aspectRatio={1}
                    />
                  </div>
                </FormSection>

                <FormSection title="Personal Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        placeholder="John Doe"
                      />
                      <FieldError message={errors.full_name} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="user@example.com"
                      />
                      <FieldError message={errors.email} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="10 digit phone number"
                      />
                      <FieldError message={errors.phone} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={form.gender}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, gender: val }))}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Prefer not to say</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={form.date_of_birth || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="blood_group">Blood Group</Label>
                      <Select
                        value={(form as any).blood_group || "O+"}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, blood_group: val } as any))}
                      >
                        <SelectTrigger id="blood_group">
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="about">About / Professional Bio</Label>
                    <Textarea
                      id="about"
                      rows={3}
                      value={form.about}
                      onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
                      placeholder="Brief description about your background, expertise, and accomplishments..."
                    />
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 2: Employment & Job Details */}
              <TabsContent value="employment" className="space-y-6 pt-2">
                <FormSection title="Job & Institutional Classification">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inst_name">Campus / Institution</Label>
                      <Input
                        id="inst_name"
                        value={form.under_institution_name || "EduBird Campus"}
                        readOnly
                        className="bg-muted/40 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="designation">Designation / Role Title</Label>
                      <Input
                        id="designation"
                        value={form.designation_name || "Faculty / Staff"}
                        onChange={(e) => setForm((prev) => ({ ...prev, designation_name: e.target.value }))}
                        placeholder="e.g. Senior Lecturer, System Administrator"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="joining_date">Date of Joining</Label>
                      <Input
                        id="joining_date"
                        type="date"
                        value={form.joining_date || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, joining_date: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="shift_timing">Shift Timing</Label>
                      <Select
                        value={form.shift_timing || "09:00 AM - 05:00 PM (General Shift)"}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, shift_timing: val }))}
                      >
                        <SelectTrigger id="shift_timing">
                          <SelectValue placeholder="Select shift timing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00 AM - 05:00 PM (General Shift)">09:00 AM - 05:00 PM (General Shift)</SelectItem>
                          <SelectItem value="08:00 AM - 02:00 PM (Morning Shift)">08:00 AM - 02:00 PM (Morning Shift)</SelectItem>
                          <SelectItem value="10:00 AM - 06:00 PM (Regular Day Shift)">10:00 AM - 06:00 PM (Regular Day Shift)</SelectItem>
                          <SelectItem value="02:00 PM - 08:00 PM (Evening Shift)">02:00 PM - 08:00 PM (Evening Shift)</SelectItem>
                          <SelectItem value="08:00 PM - 06:00 AM (Night Shift)">08:00 PM - 06:00 AM (Night Shift)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="employment_status">Employment Type / Status</Label>
                      <Select
                        value={form.employment_status || "ACTIVE"}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, employment_status: val }))}
                      >
                        <SelectTrigger id="employment_status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Full-Time Regular (Active)</SelectItem>
                          <SelectItem value="PROBATION">Probation Period</SelectItem>
                          <SelectItem value="CONTRACT">Contractual / Visiting</SelectItem>
                          <SelectItem value="NOTICE_PERIOD">Serving Notice Period</SelectItem>
                          <SelectItem value="ON_LEAVE">Extended Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hourly_charges">Hourly / Consulting Charges (₹)</Label>
                      <Input
                        id="hourly_charges"
                        type="number"
                        value={form.hourly_charges}
                        onChange={(e) => setForm((prev) => ({ ...prev, hourly_charges: e.target.value }))}
                        placeholder="e.g. 500"
                      />
                    </div>
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 3: Location */}
              <TabsContent value="location" className="space-y-6 pt-2">
                <FormSection title="Address & Geographic Coordinates">
                  <GoogleLocationPicker
                    value={form.location}
                    onChange={(loc) => setForm((prev) => ({ ...prev, location: loc }))}
                  />

                  <div className="space-y-1.5 pt-3">
                    <Label htmlFor="full_address">Full Address</Label>
                    <Input
                      id="full_address"
                      value={form.full_address}
                      onChange={(e) => setForm((prev) => ({ ...prev, full_address: e.target.value }))}
                      placeholder="House/Plot no, street, area, landmark, pincode"
                    />
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 4: Education */}
              <TabsContent value="education" className="space-y-6 pt-2">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Qualifications & Degrees</h3>
                    <p className="text-xs text-muted-foreground">Add institutional education, board, or degree credentials</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        education: [...prev.education, blankEducation()],
                      }))
                    }
                    className="gap-1 font-semibold"
                  >
                    <Plus className="size-3.5" /> Add Degree
                  </Button>
                </div>

                {form.education.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground mb-3">No degrees or educational qualifications added yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          education: [blankEducation()],
                        }))
                      }
                      className="gap-1 font-semibold"
                    >
                      <Plus className="size-3.5" /> Add First Qualification
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.education.map((edu, idx) => (
                      <EducationCard
                        key={edu.id || idx}
                        education={edu}
                        index={idx}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(patch) => {
                          const next = form.education.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                          setForm((prev) => ({ ...prev, education: next }));
                        }}
                        onDelete={() => {
                          const next = form.education.filter((_, i) => i !== idx);
                          setForm((prev) => ({ ...prev, education: next }));
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 5: Experience */}
              <TabsContent value="experience" className="space-y-6 pt-2">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Work & Teaching Experience</h3>
                    <p className="text-xs text-muted-foreground">Chronological professional background and job roles</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        experiences: [...prev.experiences, blankExperience()],
                      }))
                    }
                    className="gap-1 font-semibold"
                  >
                    <Plus className="size-3.5" /> Add Experience
                  </Button>
                </div>

                {form.experiences.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground mb-3">No work or teaching experience added yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          experiences: [blankExperience()],
                        }))
                      }
                      className="gap-1 font-semibold"
                    >
                      <Plus className="size-3.5" /> Add Work Experience
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.experiences.map((exp, idx) => (
                      <ExperienceCard
                        key={exp.id || idx}
                        experience={exp}
                        index={idx}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(patch) => {
                          const next = form.experiences.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                          setForm((prev) => ({ ...prev, experiences: next }));
                        }}
                        onDelete={() => {
                          const next = form.experiences.filter((_, i) => i !== idx);
                          setForm((prev) => ({ ...prev, experiences: next }));
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 6: Certifications & Verification Documents */}
              <TabsContent value="certifications" className="space-y-6 pt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Certifications & Honors</h3>
                      <p className="text-xs text-muted-foreground">Accreditations, specialized credentials, and awards</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          certifications: [...prev.certifications, blankCertification()],
                        }))
                      }
                      className="gap-1 font-semibold"
                    >
                      <Plus className="size-3.5" /> Add Certification
                    </Button>
                  </div>

                  {form.certifications.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">No certifications added yet (optional).</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            certifications: [blankCertification()],
                          }))
                        }
                        className="h-7 text-xs"
                      >
                        + Add Certification
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.certifications.map((cert, idx) => (
                        <CertificationCard
                          key={cert.id || idx}
                          certification={cert}
                          index={idx}
                          errors={errors}
                          onChange={(patch) => {
                            const next = form.certifications.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                            setForm((prev) => ({ ...prev, certifications: next }));
                          }}
                          onDelete={() => {
                            const next = form.certifications.filter((_, i) => i !== idx);
                            setForm((prev) => ({ ...prev, certifications: next }));
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Verification Documents</h3>
                      <p className="text-xs text-muted-foreground">Official documents (Aadhaar, PAN, Resume, Appointment letters)</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          documents: [...prev.documents, blankUserDocument()],
                        }))
                      }
                      className="gap-1 font-semibold"
                    >
                      <Plus className="size-3.5" /> Add Document
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {form.documents.map((doc, idx) => (
                      <div key={doc.id || idx} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileText className="size-3.5 text-primary" /> Document #{idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                documents: prev.documents.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5 mr-1" /> Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Document Type</Label>
                            <Select
                              value={doc.document_type || "OTHER"}
                              onValueChange={(val) => {
                                setForm((prev) => {
                                  const next = [...prev.documents];
                                  next[idx] = { ...next[idx], document_type: val };
                                  return { ...prev, documents: next };
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AADHAAR">Aadhaar Card</SelectItem>
                                <SelectItem value="PAN">PAN Card</SelectItem>
                                <SelectItem value="RESUME">Resume / Curriculum Vitae</SelectItem>
                                <SelectItem value="OFFER_LETTER">Appointment / Offer Letter</SelectItem>
                                <SelectItem value="DEGREE_CERTIFICATE">Degree / Diploma Certificate</SelectItem>
                                <SelectItem value="EXPERIENCE_CERTIFICATE">Experience Certificate</SelectItem>
                                <SelectItem value="OTHER">Other Credential</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px]">Document / ID Number</Label>
                            <Input
                              value={doc.document_number}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((prev) => {
                                  const next = [...prev.documents];
                                  next[idx] = { ...next[idx], document_number: val };
                                  return { ...prev, documents: next };
                                });
                              }}
                              placeholder="e.g. 1234 5678 9012"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <DocumentFileUpload
                            accessToken={accessToken}
                            files={doc.file_url ? [{ url: doc.file_url, name: "Staff Document", publicId: doc.public_id || "", resourceType: "auto", fileType: "auto" }] : []}
                            onFilesChange={(files) => {
                              const first = files[0];
                              setForm((prev) => {
                                const next = [...prev.documents];
                                next[idx] = {
                                  ...next[idx],
                                  file_url: first?.url || "",
                                  public_id: first?.publicId || "",
                                };
                                return { ...prev, documents: next };
                              });
                            }}
                            maxFiles={1}
                            buttonLabel="Upload Document Attachment (PDF/Image)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 7: Salary & Compensation */}
              <TabsContent value="salary" className="space-y-6 pt-2">
                <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <IndianRupee className="size-4 text-primary" />
                        Staff Salary & Compensation Structure
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Configure basic pay, allowances, deductions, and salary cycle.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-muted-foreground">Salary Cycle:</Label>
                      <Select
                        value={form.salary_frequency || "MONTHLY"}
                        onValueChange={(val: any) =>
                          setForm((prev) => ({ ...prev, salary_frequency: val }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold w-36 bg-background">
                          <SelectValue placeholder="Select cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">📅 Monthly Basis</SelectItem>
                          <SelectItem value="WEEKLY">🗓️ Weekly Basis</SelectItem>
                          <SelectItem value="DAILY">☀️ Daily Basis</SelectItem>
                          <SelectItem value="YEARLY">📆 Yearly (Annual CTC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Summary KPI Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="size-3.5" /> Total Gross Earnings
                      </span>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
                        ₹{grossSalary.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
                      <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <TrendingDown className="size-3.5" /> Total Deductions
                      </span>
                      <p className="text-lg font-bold text-rose-800 dark:text-rose-300 mt-1 font-mono">
                        ₹{totalDeductions.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                      <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                        <Wallet className="size-3.5" /> Net Take-Home Pay
                      </span>
                      <p className="text-lg font-bold text-primary mt-1 font-mono">
                        ₹{netTakeHome.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Earnings Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-3.5 text-emerald-600" />
                        Earnings & Allowances
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            salary_components: [
                              ...prev.salary_components,
                              blankSalaryComponent("", "", "EARNING"),
                            ],
                          }))
                        }
                        className="h-7 text-xs gap-1 font-semibold"
                      >
                        <Plus className="size-3" /> Add Allowance
                      </Button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/25 border border-dashed">
                      <span className="text-[11px] text-muted-foreground font-semibold shrink-0 mr-0.5">Quick Add:</span>
                      {[
                        "Basic Pay",
                        "House Rent Allowance (HRA)",
                        "Dearness Allowance (DA)",
                        "Special Allowance",
                        "Performance Incentive",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const exists = form.salary_components.some(
                              (c) => c.label.toLowerCase() === preset.toLowerCase()
                            );
                            if (exists) {
                              toast.info(`${preset} is already added.`);
                              return;
                            }
                            setForm((prev) => ({
                              ...prev,
                              salary_components: [
                                ...prev.salary_components,
                                blankSalaryComponent(preset, "", "EARNING"),
                              ],
                            }));
                          }}
                          className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-colors shadow-2xs font-medium cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {form.salary_components
                        .map((component, globalIndex) => ({ component, globalIndex }))
                        .filter(({ component }) => component.type !== "DEDUCTION")
                        .map(({ component, globalIndex }) => (
                          <div
                            key={component.id || globalIndex}
                            className="flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30"
                          >
                            <div className="flex-1">
                              <Input
                                placeholder="Component name (e.g. Basic Pay)"
                                value={component.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    salary_components: prev.salary_components.map((c, i) =>
                                      i === globalIndex ? { ...c, label: newLabel } : c
                                    ),
                                  }));
                                }}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="w-40 relative">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={component.amount}
                                onChange={(e) => {
                                  const newAmount = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    salary_components: prev.salary_components.map((c, i) =>
                                      i === globalIndex ? { ...c, amount: newAmount } : c
                                    ),
                                  }));
                                }}
                                className="h-8 text-xs bg-background pl-6 font-mono font-medium"
                              />
                              <span className="absolute left-2 top-2 text-[11px] text-muted-foreground pointer-events-none font-bold">₹</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.filter((_, i) => i !== globalIndex),
                                }));
                              }}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingDown className="size-3.5 text-rose-600" />
                        Deductions & Retentions
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            salary_components: [
                              ...prev.salary_components,
                              blankSalaryComponent("", "", "DEDUCTION"),
                            ],
                          }))
                        }
                        className="h-7 text-xs gap-1 font-semibold"
                      >
                        <Plus className="size-3" /> Add Deduction
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/25 border border-dashed">
                      <span className="text-[11px] text-muted-foreground font-semibold shrink-0 mr-0.5">Quick Add:</span>
                      {[
                        "Provident Fund (PF)",
                        "Employee State Insurance (ESI)",
                        "Professional Tax (PT)",
                        "TDS / Income Tax Deduction",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const exists = form.salary_components.some(
                              (c) => c.label.toLowerCase() === preset.toLowerCase()
                            );
                            if (exists) {
                              toast.info(`${preset} is already added.`);
                              return;
                            }
                            setForm((prev) => ({
                              ...prev,
                              salary_components: [
                                ...prev.salary_components,
                                blankSalaryComponent(preset, "", "DEDUCTION"),
                              ],
                            }));
                          }}
                          className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-600 transition-colors shadow-2xs font-medium cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {form.salary_components
                        .map((component, globalIndex) => ({ component, globalIndex }))
                        .filter(({ component }) => component.type === "DEDUCTION")
                        .map(({ component, globalIndex }) => (
                          <div
                            key={component.id || globalIndex}
                            className="flex items-center gap-2 p-2.5 rounded-lg border bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
                          >
                            <div className="flex-1">
                              <Input
                                placeholder="Deduction name (e.g. Provident Fund)"
                                value={component.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    salary_components: prev.salary_components.map((c, i) =>
                                      i === globalIndex ? { ...c, label: newLabel } : c
                                    ),
                                  }));
                                }}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="w-40 relative">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={component.amount}
                                onChange={(e) => {
                                  const newAmount = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    salary_components: prev.salary_components.map((c, i) =>
                                      i === globalIndex ? { ...c, amount: newAmount } : c
                                    ),
                                  }));
                                }}
                                className="h-8 text-xs bg-background pl-6 font-mono font-medium text-rose-600"
                              />
                              <span className="absolute left-2 top-2 text-[11px] text-muted-foreground pointer-events-none font-bold">₹</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.filter((_, i) => i !== globalIndex),
                                }));
                              }}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 8: Banking & Statutory Records */}
              <TabsContent value="bank" className="space-y-6 pt-2">
                <FormSection title="Bank Account & Direct Deposit Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="payment_mode">Payment Mode</Label>
                      <Select
                        value={form.salary_account?.payment_mode || "BANK_TRANSFER"}
                        onValueChange={(val) =>
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, payment_mode: val },
                          }))
                        }
                      >
                        <SelectTrigger id="payment_mode">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                          <SelectItem value="UPI">📱 UPI Payment</SelectItem>
                          <SelectItem value="CHEQUE">📝 Cheque</SelectItem>
                          <SelectItem value="CASH">💵 Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={form.salary_account?.bank_name || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, bank_name: val },
                          }));
                        }}
                        placeholder="e.g. State Bank of India, HDFC Bank"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account_holder_name">Account Holder Name</Label>
                      <Input
                        id="account_holder_name"
                        value={form.salary_account?.account_holder_name || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, account_holder_name: val },
                          }));
                        }}
                        placeholder="As written on bank passbook"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account_number">Bank Account Number</Label>
                      <Input
                        id="account_number"
                        value={form.salary_account?.account_number || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, account_number: val },
                          }));
                        }}
                        placeholder="Enter full account number"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ifsc_code">IFSC Code</Label>
                      <Input
                        id="ifsc_code"
                        value={form.salary_account?.ifsc_code || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, ifsc_code: val },
                          }));
                        }}
                        placeholder="e.g. SBIN0001234"
                        className="font-mono uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="branch_name">Branch Name</Label>
                      <Input
                        id="branch_name"
                        value={form.salary_account?.branch_name || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, branch_name: val },
                          }));
                        }}
                        placeholder="Branch city / area"
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Statutory & Tax Identification">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pan_number">PAN Card Number</Label>
                      <Input
                        id="pan_number"
                        value={form.salary_account?.pan_number || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, pan_number: val },
                          }));
                        }}
                        placeholder="ABCDE1234F"
                        className="font-mono uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="uan_number">UAN / PF Number</Label>
                      <Input
                        id="uan_number"
                        value={form.salary_account?.uan_number || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, uan_number: val },
                          }));
                        }}
                        placeholder="10XXXXXXXXXX"
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="esi_number">ESI Insurance Number</Label>
                      <Input
                        id="esi_number"
                        value={form.salary_account?.esi_number || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            salary_account: { ...prev.salary_account, esi_number: val },
                          }));
                        }}
                        placeholder="ESI IP Number"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </FormSection>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Password Reset Modal */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-amber-600" /> Update Account Password
            </DialogTitle>
            <DialogDescription>
              Set a new secure password for your account credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={updatingPassword}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={updatingPassword}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    updatePassword();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={updatingPassword}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={updatePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
