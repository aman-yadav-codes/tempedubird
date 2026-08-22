"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
  UserCheck,
  UserRound,
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

export default function AccountPage() {
  const { accessToken, updateUser: updateAuthUser } = useAuthStore();
  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"view" | "edit">("view");

  // Form State
  const [form, setForm] = useState<AddUserForm>(getInitialForm([], null));
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
      setForm(getInitialForm([], userData));
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

    form.education.forEach((edu, index) => {
      const hasValues = hasAnyValue([
        edu.qualification,
        edu.institution_id,
        edu.from_year,
        edu.to_year,
      ]);
      if (hasValues) {
        if (!safeTrim(edu.qualification)) {
          nextErrors[`education.${index}.qualification`] = "Required.";
        }
        if (!edu.institution_id && !safeTrim(edu.institution_name)) {
          nextErrors[`education.${index}.institution_id`] = "Required.";
        }
        if (!edu.from_year || !edu.to_year) {
          nextErrors[`education.${index}.years`] = "Years are required.";
        }
      }
    });

    form.experiences.forEach((exp, index) => {
      const hasValues = hasAnyValue([
        exp.job_title,
        exp.company_name,
        exp.from_month,
        exp.from_year,
      ]);
      if (hasValues) {
        if (!safeTrim(exp.job_title)) {
          nextErrors[`experience.${index}.job_title`] = "Required.";
        }
        if (!exp.from_year) {
          nextErrors[`experience.${index}.from_year`] = "From year required.";
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!accessToken) return;
    if (!validateForm()) {
      toast.error("Please resolve highlighted validation errors.");
      return;
    }

    setSaving(true);
    try {
      const compactExperiences = form.experiences.filter((exp) =>
        hasAnyValue([exp.job_title, exp.company_name, exp.from_month, exp.from_year])
      );
      const compactEducation = form.education.filter((edu) =>
        hasAnyValue([edu.qualification, edu.institution_id, edu.from_year, edu.to_year])
      );
      const compactCertifications = form.certifications.filter((cert) =>
        hasAnyValue([cert.name, cert.issued_authority, cert.duration])
      );

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
        },
        location: hasAnyValue([
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
        throw new Error(json.error || "Failed to update profile records");
      }

      toast.success("Profile records updated successfully!");
      const updatedUser = json.data as AdminUserDetails;
      setUser(updatedUser);
      setForm(getInitialForm([], updatedUser));
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
        let firstIssue: string | null = null;
        if (json.issues && typeof json.issues === "object") {
          for (const value of Object.values(json.issues as Record<string, unknown>)) {
            if (Array.isArray(value) && value[0]) {
              firstIssue = String(value[0]);
              break;
            }
          }
        }
        throw new Error(String(firstIssue || json.error || "Failed to update password"));
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

  const primaryRole = user?.roles[0] ?? "User";
  const userInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

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
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50">
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
              variant={activeView === "view" ? "default" : "outline"}
              onClick={() => setActiveView("view")}
            >
              <Eye className="mr-2 size-4" />
              View Profile
            </Button>
            <Button
              type="button"
              variant={activeView === "edit" ? "default" : "outline"}
              onClick={() => setActiveView("edit")}
            >
              <Edit3 className="mr-2 size-4" />
              Modify Records
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="mr-2 size-4 text-amber-600" />
              Password
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fetchAccount}
              disabled={refreshing}
              title="Refresh profile"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Switch: View vs Edit */}
      {activeView === "view" ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <UserProfileContent user={user} />
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
                  Update your personal info, location, education, experience, and uploaded documents.
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
              <TabsList className="flex flex-wrap w-full items-center justify-start gap-1.5 p-1.5 bg-muted/60 rounded-xl border border-border/50 min-h-11">
                <TabsTrigger value="basic" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <User className="mr-1.5 size-3.5" /> Personal Info
                </TabsTrigger>
                <TabsTrigger value="location" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <MapPin className="mr-1.5 size-3.5" /> Location
                </TabsTrigger>
                <TabsTrigger value="education" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <GraduationCap className="mr-1.5 size-3.5" /> Education
                </TabsTrigger>
                <TabsTrigger value="experience" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <BriefcaseBusiness className="mr-1.5 size-3.5" /> Experience
                </TabsTrigger>
                <TabsTrigger value="certifications" className="flex-1 min-w-[120px] rounded-lg text-xs py-2 font-bold">
                  <Award className="mr-1.5 size-3.5" /> Docs & Certs
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
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="about">About / Bio</Label>
                    <Textarea
                      id="about"
                      rows={4}
                      value={form.about}
                      onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
                      placeholder="Brief description about your background, skills, and expertise..."
                    />
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 2: Location */}
              <TabsContent value="location" className="space-y-6 pt-2">
                <FormSection title="Address & Location">
                  <GoogleLocationPicker
                    value={form.location}
                    onChange={(loc) => setForm((prev) => ({ ...prev, location: loc }))}
                  />

                  <div className="space-y-1.5 pt-4">
                    <Label htmlFor="full_address">Full Street Address</Label>
                    <Textarea
                      id="full_address"
                      rows={3}
                      value={form.full_address}
                      onChange={(e) => setForm((prev) => ({ ...prev, full_address: e.target.value }))}
                      placeholder="House/Flat No., Street, Landmark..."
                    />
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 3: Education */}
              <TabsContent value="education" className="space-y-6 pt-2">
                <FormSection title="Education Records">
                  <div className="space-y-4">
                    {form.education.map((education, index) => (
                      <EducationCard
                        key={education.id || index}
                        index={index}
                        education={education}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(updated) =>
                          setForm((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === index ? { ...item, ...updated } : item
                            ),
                          }))
                        }
                        onDelete={() =>
                          setForm((prev) => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          education: [...prev.education, blankEducation()],
                        }))
                      }
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 size-4" /> Add Education Record
                    </Button>
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 4: Work Experience */}
              <TabsContent value="experience" className="space-y-6 pt-2">
                <FormSection title="Work Experience">
                  <div className="space-y-4">
                    {form.experiences.map((experience, index) => (
                      <ExperienceCard
                        key={experience.id || index}
                        index={index}
                        experience={experience}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(updated) =>
                          setForm((prev) => ({
                            ...prev,
                            experiences: prev.experiences.map((item, i) =>
                              i === index ? { ...item, ...updated } : item
                            ),
                          }))
                        }
                        onDelete={() =>
                          setForm((prev) => ({
                            ...prev,
                            experiences: prev.experiences.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          experiences: [...prev.experiences, blankExperience()],
                        }))
                      }
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 size-4" /> Add Work Experience
                    </Button>
                  </div>
                </FormSection>
              </TabsContent>

              {/* Tab 5: Certifications & Documents */}
              <TabsContent value="certifications" className="space-y-6 pt-2">
                <FormSection title="Certifications">
                  <div className="space-y-4">
                    {form.certifications.map((certification, index) => (
                      <CertificationCard
                        key={certification.id || index}
                        index={index}
                        certification={certification}
                        errors={errors}
                        onChange={(updated) =>
                          setForm((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((item, i) =>
                              i === index ? { ...item, ...updated } : item
                            ),
                          }))
                        }
                        onDelete={() =>
                          setForm((prev) => ({
                            ...prev,
                            certifications: prev.certifications.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          certifications: [...prev.certifications, blankCertification()],
                        }))
                      }
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 size-4" /> Add Certification
                    </Button>
                  </div>
                </FormSection>

                <FormSection title="Uploaded Documents">
                  <div className="space-y-4">
                    <DocumentFileUpload
                      accessToken={accessToken}
                      files={form.documents
                        .filter((doc) => doc.file_url)
                        .map((doc) => ({
                          url: doc.file_url,
                          publicId: doc.public_id || "",
                          resourceType: doc.resource_type || "image",
                          fileType: doc.document_type || "document",
                        }))}
                      onFilesChange={(newFiles) =>
                        setForm((prev) => ({
                          ...prev,
                          documents: newFiles.map((file, idx) => ({
                            id: prev.documents[idx]?.id || String(idx + 1),
                            document_type: file.fileType || prev.documents[idx]?.document_type || "document",
                            document_number: prev.documents[idx]?.document_number || "",
                            file_url: file.url,
                            public_id: file.publicId,
                            resource_type: file.resourceType,
                            files: [file],
                            is_verified: prev.documents[idx]?.is_verified || false,
                          })),
                        }))
                      }
                    />
                  </div>
                </FormSection>
              </TabsContent>
            </Tabs>

            {/* Bottom Floating Save Button */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveView("view")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" /> Save Profile Records
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) resetPasswordForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-amber-600" /> Update Account Password
            </DialogTitle>
            <DialogDescription>
              Set a new secure password for your current account credentials.
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


