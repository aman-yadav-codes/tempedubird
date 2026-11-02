"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeDollarSign,
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function StaffProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Determine if in platformadmin or admin section
  const isPlatform = typeof window !== "undefined" && window.location.pathname.startsWith("/platformadmin");
  const basePrefix = isPlatform ? "/platformadmin" : "/admin";

  useEffect(() => {
    if (!isReady || !accessToken || !userId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/detail?id=${userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to load staff member profile");
        const json = await res.json();
        setUser(json.data || json);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error loading profile");
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [isReady, accessToken, userId]);

  if (loading) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-5xl py-12 text-center space-y-4">
        <p className="text-muted-foreground text-sm">Staff member not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const profile = user.profile || {};
  const location = user.location || {};
  const education = Array.isArray(user.education) ? user.education : [];
  const experiences = Array.isArray(user.experiences) ? user.experiences : [];
  const certifications = Array.isArray(user.certifications) ? user.certifications : [];
  const salaryAccount = user.salary_account || {};
  const commission = user.commission || {};

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Staff List
        </Button>
        <Badge variant={user.is_active ? "default" : "destructive"}>
          {user.is_active ? "Active Account" : "Inactive / Suspended"}
        </Badge>
      </div>

      {/* Profile Header Card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="h-20 w-20 border-4 border-background shadow-md">
              <AvatarImage src={user.avatar_url || ""} alt={user.full_name} />
              <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                {user.full_name?.slice(0, 2)?.toUpperCase() || "ST"}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {user.full_name}
                </h1>
                {profile.designation_name && (
                  <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
                    {profile.designation_name}
                  </Badge>
                )}
                {user.roles?.map((role: string) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground pt-1">
                {user.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {profile.under_institution_name && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.under_institution_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Nav Actions Bar */}
        <div className="border-t bg-muted/20 px-6 py-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0 uppercase tracking-wider text-[10px]">
            Quick Views:
          </span>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <a href={`${basePrefix}/staff/documents?staffUserId=${user.id}`}>
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Documents
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <a href={`${basePrefix}/staff/salary?staffUserId=${user.id}`}>
              <Landmark className="h-3.5 w-3.5 text-emerald-600" />
              Salary Records
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <a href={`${basePrefix}/staff/salary-slips?staffUserId=${user.id}`}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
              Salary Slips
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <a href={`${basePrefix}/staff/attendance?staffUserId=${user.id}`}>
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              Attendance
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <a href={`${basePrefix}/staff/performance?staffUserId=${user.id}`}>
              <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
              Performance
            </a>
          </Button>
        </div>
      </Card>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment & Work Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Employment & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Joining Date</p>
                <p className="font-semibold text-foreground mt-0.5">{profile.joining_date ? formatDate(profile.joining_date) : "Not recorded"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-semibold text-foreground mt-0.5">{profile.date_of_birth ? formatDate(profile.date_of_birth) : "Not recorded"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Shift Timing</p>
                <p className="font-semibold text-foreground mt-0.5">{profile.shift_timing || "Standard 9:00 AM - 5:00 PM"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Employment Status</p>
                <Badge variant="outline" className="mt-1 font-semibold">
                  {profile.employment_status || "ACTIVE"}
                </Badge>
              </div>
            </div>

            {profile.about && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-1">About / Bio</p>
                <p className="whitespace-pre-wrap text-foreground">{profile.about}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address & Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Address & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground">Full Address</p>
              <p className="font-medium text-foreground mt-0.5">{location.full_address || location.formatted_address || "Not specified"}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t">
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-semibold text-foreground mt-0.5">{location.city || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">State</p>
                <p className="font-semibold text-foreground mt-0.5">{location.state || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pincode</p>
                <p className="font-semibold text-foreground mt-0.5">{location.pincode || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary & Bank Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600" />
              Salary & Bank Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Bank Name</p>
                <p className="font-semibold text-foreground mt-0.5">{salaryAccount.bank_name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Number</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{salaryAccount.account_number || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IFSC Code</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{salaryAccount.ifsc_code || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Salary Type</p>
                <p className="capitalize font-semibold text-foreground mt-0.5">{salaryAccount.salary_type || "Monthly Fixed"}</p>
              </div>
              {salaryAccount.base_salary && (
                <div>
                  <p className="text-muted-foreground">Base Salary</p>
                  <p className="font-bold text-sm text-emerald-600 mt-0.5">₹{Number(salaryAccount.base_salary).toLocaleString("en-IN")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commission & Incentive Structure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 text-primary" />
              Commission & Incentive Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground">Commission Model</p>
              <Badge variant="outline" className="mt-1 font-semibold">
                {commission.commission_type || "Condition-Based Rules"}
              </Badge>
            </div>
            {commission.commission_rate && (
              <div>
                <p className="text-muted-foreground">Commission Rate</p>
                <p className="font-bold text-sm text-primary mt-0.5">{commission.commission_rate}%</p>
              </div>
            )}
            {commission.payout_frequency && (
              <div>
                <p className="text-muted-foreground">Payout Terms</p>
                <p className="font-medium text-foreground mt-0.5">{commission.payout_frequency}</p>
              </div>
            )}
            {Array.isArray(commission.rules) && commission.rules.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-muted-foreground font-semibold">Configured Rules ({commission.rules.length}):</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {commission.rules.map((r: any, idx: number) => (
                    <li key={idx} className="truncate">
                      {r.trigger_condition || "Rule"}: {r.commission_rate}% {r.reward_type}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Education & Experience */}
      {(education.length > 0 || experiences.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Education & Professional Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {education.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Education</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {education.map((edu: any, i: number) => (
                    <div key={i} className="rounded-lg border p-2.5 bg-muted/10">
                      <p className="font-bold text-foreground">{edu.qualification || edu.degree}</p>
                      <p className="text-muted-foreground">{edu.institution_name}</p>
                      {edu.passing_year && <p className="text-[11px] text-muted-foreground">Year: {edu.passing_year}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {experiences.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Work Experience</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {experiences.map((exp: any, i: number) => (
                    <div key={i} className="rounded-lg border p-2.5 bg-muted/10">
                      <p className="font-bold text-foreground">{exp.job_title}</p>
                      <p className="text-muted-foreground">{exp.company_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
