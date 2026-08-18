"use client";

import * as React from "react";
import {
  Award,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  GraduationCap,
  IdCard,
  MapPin,
  Mail,
  Phone,
  UsersRound,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDetailSurface } from "@/components/shared/responsive-detail-surface";
import { capitalize } from "@/lib/utils/capitalize";
import { TEACHER_TYPE_OPTIONS } from "@/lib/utils/user-form.constants";
import type { AdminUserDetails } from "@/lib/queries/user";
import type { StudentRecordsResponse } from "@/app/admin/students/add-student-dialog";

type UserProfileSheetProps = {
  user: AdminUserDetails | null;
  studentRecords?: StudentRecordsResponse | null;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CATEGORY_COLORS = [
  "border-blue-500/30 text-blue-400 bg-blue-500/10",
  "border-purple-500/30 text-purple-400 bg-purple-500/10",
  "border-green-500/30 text-green-400 bg-green-500/10",
  "border-orange-500/30 text-orange-400 bg-orange-500/10",
  "border-pink-500/30 text-pink-400 bg-pink-500/10",
  "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
];
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function monthName(month: number | null) {
  if (!month) return "";
  return MONTHS[month - 1] ?? "";
}

function formatExperienceDate(item: AdminUserDetails["experiences"][number]) {
  const from = `${monthName(item.from_month)} ${item.from_year}`;
  const to = item.is_current
    ? "Present"
    : `${monthName(item.to_month)} ${item.to_year}`;

  return `${from} - ${to}`;
}

function TimelineSection({
  title,
  icon: Icon,
  children,
  emptyText,
}: {
  title: string;
  icon: typeof BriefcaseBusiness;
  children: React.ReactNode;
  emptyText: string;
}) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4" />
        {title}
      </h3>
      {hasChildren ? (
        <div className="relative ml-1 border-l border-border pl-6">
          {children}
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function TimelineItem({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative pb-5 last:pb-0">
      <span className="absolute -left-[30px] top-1.5 size-3 rounded-full border-2 border-background bg-background ring-1 ring-border" />
      <div className="space-y-1">
        <p className="font-medium leading-tight">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {meta && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {meta}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function UserProfileSheet({
  user,
  studentRecords = null,
  loading = false,
  open,
  onOpenChange,
}: UserProfileSheetProps) {
  return (
    <ResponsiveDetailSurface
      open={open}
      onOpenChange={onOpenChange}
      title="Profile"
      description="User account, location, and professional background."
      sheetClassName="sm:max-w-2xl"
      closeLabel="Close profile"
    >
      {loading ? (
        <div className="space-y-5 px-4 pb-6">
          <Skeleton className="h-28 w-full rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <Skeleton className="h-36 w-full rounded-md" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      ) : (
        <UserProfileContent user={user} studentRecords={studentRecords} />
      )}
    </ResponsiveDetailSurface>
  );
}

function formatStudentDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StudentInfoGrid({
  items,
}: {
  items: Array<[string, React.ReactNode]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/15 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 text-sm font-medium">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function studentEnrollmentLabel(enrollment: StudentRecordsResponse["enrollments"][number]) {
  return [
    enrollment.program_name || enrollment.class_category_name || "Class",
    enrollment.section_name ? `Section ${enrollment.section_name}` : null,
  ].filter(Boolean).join(" - ");
}

export function UserProfileContent({
  user,
  studentRecords = null,
}: {
  user: AdminUserDetails | null;
  studentRecords?: StudentRecordsResponse | null;
}) {
  const categoryColorMap = Object.fromEntries(
    (user?.teaching_categories ?? []).map((category, index) => [
      category.name,
      CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    ])
  );

  if (!user) return null;

  const institutions =
    user.institutions.length > 0
      ? user.institutions
      : user.profile.under_institution_id || user.profile.under_institution_name
        ? [
            {
              id: user.profile.under_institution_id ?? 0,
              name: user.profile.under_institution_name ?? "-",
              role_id: user.profile.membership_role_id ?? null,
              role_name: null,
              role_code: null,
              is_active: true,
            },
          ]
        : [];

  return (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex items-start gap-4 rounded-md border p-4">
              <Avatar size="lg" className="size-14">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback>{initials(user.full_name) || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="truncate text-lg font-semibold">
                    {user.full_name}
                  </h2>
                  <p className="text-sm capitalize text-muted-foreground">
                    {user.roles.join(", ") || "No role"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={
                      user.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">
                    {user.is_verified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge
                    className={
                      user.is_profile_complete
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                        : "border border-amber-500/30 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                    }
                  >
                    {user.is_profile_complete
                      ? "Profile Complete"
                      : "Profile Incomplete"}
                  </Badge>
                  <Badge variant="outline">
                    {user.login_provider ?? "email"}
                  </Badge>
                </div>
              </div>
            </div>



            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-md border p-3">
                <Mail className="size-4 text-muted-foreground" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-3">
                <Phone className="size-4 text-muted-foreground" />
                <span>{user.phone || "-"}</span>
              </div>
            </div>



            {studentRecords && (
              <>
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <IdCard className="size-4" />
                    Student Profile
                  </h3>
                  <StudentInfoGrid
                    items={[
                      ["Admission Number", studentRecords.profile?.admission_number || "-"],
                      ["APAR ID", studentRecords.profile?.apar_id || "-"],
                      ["Date of Birth", formatStudentDate(studentRecords.profile?.date_of_birth)],
                      ["Blood Group", studentRecords.profile?.blood_group || "-"],
                      ["Emergency Contact", studentRecords.profile?.emergency_contact_name || "-"],
                      ["Emergency Phone", studentRecords.profile?.emergency_contact_phone || "-"],
                    ]}
                  />
                </section>

                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="size-4" />
                    Enrollment & Academic Details
                  </h3>
                  {studentRecords.enrollments?.length ? (
                    <div className="grid gap-2">
                      {studentRecords.enrollments.map((enrollment) => (
                        <div key={enrollment.id ?? `${enrollment.program_id}-${enrollment.academic_year_id}`} className="rounded-md border bg-muted/15 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {studentEnrollmentLabel(enrollment)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {enrollment.institution_name || "-"} - {enrollment.academic_year_name || "Session"}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                enrollment.status === "active"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : ""
                              }
                            >
                              {enrollment.status ? capitalize(String(enrollment.status)) : "Draft"}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                            <span>Roll: <span className="font-medium text-foreground">{enrollment.roll_number || "-"}</span></span>
                            <span>Admitted: <span className="font-medium text-foreground">{formatStudentDate(enrollment.admission_date as string | null | undefined)}</span></span>
                            <span>Category: <span className="font-medium text-foreground">{enrollment.class_category_name || "-"}</span></span>
                          </div>
                          {enrollment.remarks ? (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{String(enrollment.remarks)}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No enrollments added.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <UsersRound className="size-4" />
                    Guardians
                  </h3>
                  {studentRecords.guardians?.length ? (
                    <div className="space-y-2">
                      {studentRecords.guardians.map((guardian) => (
                        <div key={guardian.id ?? guardian.guardian_user_id} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{guardian.guardian_name || guardian.guardian_email || "Guardian"}</p>
                              <p className="text-sm text-muted-foreground">{guardian.guardian_email || "-"}</p>
                              <p className="text-sm text-muted-foreground">{guardian.guardian_phone || "-"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{guardian.relationship || "Guardian"}</Badge>
                              {guardian.is_primary && <Badge>Primary</Badge>}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Parent ID: {guardian.guardian_user_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No guardians added.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="size-4" />
                    Documents
                  </h3>
                  {studentRecords.documents?.length ? (
                    <div className="space-y-2">
                      {studentRecords.documents.map((document) => (
                        <a
                          key={document.id ?? document.file_url}
                          href={document.file_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{document.document_type || "Document"}</p>
                            <p className="truncate text-sm text-muted-foreground">{document.document_number || "No document number"}</p>
                          </div>
                          <Badge variant={document.is_verified ? "default" : "outline"}>
                            {document.is_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No documents added.</p>
                  )}
                </section>
              </>
            )}

            {user.profile.is_teacher && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Profile</h3>
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">
                  {user.profile.about || "No about text added."}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Gender</span>
                    <p>
                      {user.profile.gender
                        ? `Gender: ${capitalize(user.profile.gender)}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Hourly charges
                    </span>
                    <p>
                      {user.profile.hourly_charges
                        ? `₹${user.profile.hourly_charges}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            )}

            {user.profile.is_teacher && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Teaching Information
              </h3>

              <div className="rounded-md border p-3">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Teacher type
                      </p>
                      <p className="mt-1 text-sm">
                        {user.profile.is_teacher
                          ? TEACHER_TYPE_OPTIONS.find(
                            (option) => option.value === user.profile.teacher_type
                          )?.label ?? "Teacher"
                          : "Not a teacher"}
                      </p>
                    </div>

                    {user.profile.teacher_type === "institute_teacher" && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Designation
                          </p>
                          <p className="mt-1 text-sm">
                            {user.profile.designation_name || "-"}
                          </p>
                        </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Categories
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {user.teaching_categories.length > 0 ? (
                        user.teaching_categories.map((category) => (
                          <Badge
                            key={category.id}
                            variant="outline"
                            className={categoryColorMap[category.name]}
                          >
                            {category.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No categories selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Subjects
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {user.teaching_subjects.length > 0 ? (
                        user.teaching_subjects.map((subject) => (
                          <Badge
                            key={subject.id}
                            variant="outline"
                            className={
                              categoryColorMap[subject.category_name] ??
                              "border-slate-500/30 text-slate-400 bg-slate-500/10"
                            }
                          >
                            <span>{subject.name}</span>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No subjects selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4" />
                Location
              </h3>
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">
                  {user.location?.formatted_address ||
                    user.location?.full_address ||
                    "No location added."}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p>Country: {user.location?.country || "-"}</p>
                  <p>State: {user.location?.state || "-"}</p>
                  <p>City: {user.location?.city || "-"}</p>
                  <p>Pincode: {user.location?.pincode || "-"}</p>
                </div>
              </div>
            </section>

            <TimelineSection
              title="Experience"
              icon={BriefcaseBusiness}
              emptyText="No experience added."
            >
              {user.experiences.map((item) => (
                <TimelineItem
                  key={item.id}
                  title={item.job_title}
                  subtitle={item.company_name}
                  meta={formatExperienceDate(item)}
                />
              ))}
            </TimelineSection>

            <TimelineSection
              title="Education"
              icon={GraduationCap}
              emptyText="No education added."
            >
              {user.education.map((item) => (
                <TimelineItem
                  key={item.id}
                  title={item.qualification}
                  subtitle={item.institution_name}
                  meta={`${item.from_year} - ${item.to_year}`}
                />
              ))}
            </TimelineSection>

            <TimelineSection
              title="Certifications"
              icon={Award}
              emptyText="No certifications added."
            >
              {user.certifications.map((item) => (
                <TimelineItem
                  key={item.id}
                  title={item.name}
                  subtitle={item.issued_authority}
                  meta={item.duration ? `${item.duration} month(s)` : null}
                />
              ))}
            </TimelineSection>
          </div>
  );
}
