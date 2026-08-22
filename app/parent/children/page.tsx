"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  Calendar,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  Plus,
  School,
  IdCard,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import {
  getStoredActiveStudentProfileId,
  setStoredActiveStudentProfileId,
  setStoredActiveStudentUserId,
  setStoredActiveStudentEnrollmentId,
} from "@/lib/auth/active-student-enrollment";
import { setStoredActiveInstitutionId } from "@/lib/auth/active-institution";
import { AddStudentDialog, type RoleOption } from "@/app/admin/students/add-student-dialog";

type ChildRecord = {
  student_profile_id: number;
  student_user_id: number;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  admission_number: string | null;
  apar_id: string | null;
  guardian_link_id: number;
  relationship: string;
  is_primary: boolean;
  linked_at: string;
  enrollment_id: number | null;
  roll_number: string | null;
  enrollment_status: string | null;
  program_id: number | null;
  program_title: string;
  institution_id: number | null;
  institution_name: string;
  academic_year_name: string | null;
};

export default function ParentChildrenPage() {
  const { user, accessToken } = useAuthStore();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(() => getStoredActiveStudentProfileId());

  const handleSelectChild = useCallback((child: ChildRecord, showToast = true) => {
    setActiveProfileId(child.student_profile_id);
    setStoredActiveStudentProfileId(child.student_profile_id);
    setStoredActiveStudentUserId(child.student_user_id);
    if (child.enrollment_id) {
      setStoredActiveStudentEnrollmentId(child.enrollment_id);
    }
    if (child.institution_id) {
      setStoredActiveInstitutionId(child.institution_id);
    }
    if (showToast) {
      toast.success(`Active child profile switched to ${child.student_name}`);
    }
  }, []);

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/parent/children", { headers });
      const json = await res.json();
      if (res.ok) {
        const list: ChildRecord[] = json.children || [];
        setChildren(list);
        if (list.length > 0) {
          const stored = getStoredActiveStudentProfileId();
          const match = list.find((c) => c.student_profile_id === stored) || list[0];
          setActiveProfileId(match.student_profile_id);
          setStoredActiveStudentProfileId(match.student_profile_id);
          setStoredActiveStudentUserId(match.student_user_id);
          if (match.enrollment_id) {
            setStoredActiveStudentEnrollmentId(match.enrollment_id);
          }
          if (match.institution_id) {
            setStoredActiveInstitutionId(match.institution_id);
          }
        }
      } else {
        toast.error(json.error || "Failed to load children records");
      }
    } catch (err) {
      toast.error("Error loading children records");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchStudentRoles = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(
        "/api/admin/access/options?type=institutionRoles&search=student&limit=50&context=student-management",
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        const studentRoles = (json.data ?? []).filter((r: RoleOption) => r.code === "student");
        if (studentRoles.length > 0) {
          setRoles(studentRoles);
          return;
        }
      }
      setRoles([{ id: 5, name: "Student", code: "student", scope_code: "institution" }]);
    } catch {
      setRoles([{ id: 5, name: "Student", code: "student", scope_code: "institution" }]);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchChildren();
    fetchStudentRoles();
  }, [fetchChildren, fetchStudentRoles]);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              My Children / Students
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select a child profile to view and access their classroom records, timetable, fees, and institution portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChildren}
            disabled={loading}
            className="text-xs font-semibold h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* EXACT SAME DIALOG COMPONENT USED IN INSTITUTION ADMIN PANEL */}
          <AddStudentDialog
            roles={roles}
            accessToken={accessToken}
            onSaved={fetchChildren}
            open={addModalOpen}
            onOpenChange={setAddModalOpen}
          />
        </div>
      </div>

      {/* CHILDREN CARDS LIST */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading linked student records...</span>
        </div>
      ) : children.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-4 bg-card border-border">
          <div className="p-4 bg-primary/10 text-primary rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Users className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">No Children Registered Yet</h3>
            <p className="text-xs max-w-md mx-auto leading-relaxed">
              You haven&apos;t linked any student profiles to your guardian account. Click the button below to register your child using the official student registration form.
            </p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="font-bold text-xs bg-[#D91B1B] hover:bg-[#b91515] text-white px-6 mt-2 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add First Student
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {children.length} {children.length === 1 ? "Student Profile" : "Student Profiles"}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const isSelected = child.student_profile_id === activeProfileId;
              return (
                <Card
                  key={child.student_profile_id}
                  className={`p-6 space-y-5 bg-card border shadow-sm transition-all rounded-2xl relative overflow-hidden ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/[0.02]"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  {/* Top Banner */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-12 w-12 rounded-2xl font-black text-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}>
                        {child.student_name ? child.student_name[0].toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                            {child.relationship || "Child"}
                          </Badge>
                          {isSelected ? (
                            <Badge className="text-[10px] font-extrabold bg-emerald-600 text-white gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Selected Profile
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                              Registered
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-extrabold text-base text-foreground truncate mt-1">
                          {child.student_name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Profile Selection Button */}
                  {!isSelected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectChild(child, true)}
                      className="w-full text-xs font-bold border-rose-500/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1.5 h-8"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                      Select This Profile
                    </Button>
                  )}

                  {/* Academic Program Info */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Enrolled Program</span>
                      {child.admission_number && (
                        <span className="text-[10px] font-bold text-primary">{child.admission_number}</span>
                      )}
                    </div>
                    <h4 className="font-bold text-foreground text-sm leading-snug">
                      {child.program_title || "No Program Enrolled"}
                    </h4>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      {child.institution_name || "Self / Independent"}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-3">
                    {child.student_phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{child.student_phone}</span>
                      </div>
                    )}

                    {child.student_email && (
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{child.student_email}</span>
                      </div>
                    )}

                    {child.gender && (
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Gender:</span> {child.gender}
                      </div>
                    )}

                    {child.blood_group && (
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Blood:</span> {child.blood_group}
                      </div>
                    )}
                  </div>

                  {/* Quick Academic Actions */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <Link
                        href="/admin/classroom/attendance"
                        onClick={() => handleSelectChild(child, false)}
                      >
                        <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-7.5 px-1 gap-1">
                          <School className="h-3 w-3 text-primary" />
                          Attendance
                        </Button>
                      </Link>

                      <Link
                        href="/admin/classroom/my-timetable"
                        onClick={() => handleSelectChild(child, false)}
                      >
                        <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-7.5 px-1 gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          Timetable
                        </Button>
                      </Link>

                      <Link
                        href="/admin/classroom/fees"
                        onClick={() => handleSelectChild(child, false)}
                      >
                        <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-7.5 px-1 gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          Fee Details
                        </Button>
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                      <Link
                        href={`/parent/enquiries?child_user_id=${child.student_user_id}`}
                        onClick={() => handleSelectChild(child, false)}
                        className="text-center"
                      >
                        <Button variant="ghost" size="sm" className="w-full text-[11px] font-bold h-7 text-muted-foreground hover:text-primary gap-1">
                          <HelpCircle className="h-3.5 w-3.5" />
                          Enquiries
                        </Button>
                      </Link>

                      <Link
                        href="/courses"
                        onClick={() => handleSelectChild(child, false)}
                        className="text-center"
                      >
                        <Button variant="ghost" size="sm" className="w-full text-[11px] font-bold h-7 text-muted-foreground hover:text-primary gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          New Course
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
