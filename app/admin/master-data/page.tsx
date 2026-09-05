"use client";

import Link from "next/link";
import {
  FolderTree,
  Edit2,
  BookOpen,
  Building2,
  BadgeCheck,
  GraduationCap,
  BookCheck,
  ClipboardList,
  ClipboardCheck,
  FileText,
  StickyNote,
  UserCog,
  MapPin,
  LibraryBig,
  IdCard,
  CalendarDays,
  Briefcase,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

const MASTER_DATA_MODULES = [
  {
    title: "Marketplace & Teacher Approvals",
    url: "/admin/approvals",
    icon: ShieldCheck,
    description: "Review, allow, or decline marketplace requests for assignments, notes, practice exams, exams, and teachers.",
    badge: "Approvals",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Category Tree",
    url: "/admin/content/tree",
    icon: FolderTree,
    description: "Multi-level taxonomic hierarchy for courses, departments, streams, and specializations.",
    badge: "Taxonomy",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Manage Categories",
    url: "/admin/content/categories",
    icon: Edit2,
    description: "Create, rename, re-parent, and map categories directly to academic boards.",
    badge: "Categories",
    color: "from-indigo-500/10 to-violet-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Boards",
    url: "/admin/content/boards",
    icon: BookOpen,
    description: "Educational boards, university councils, and state/central examination authorities.",
    badge: "Boards",
    color: "from-violet-500/10 to-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Universities",
    url: "/admin/content/universities",
    icon: Building2,
    description: "Accredited universities, deemed institutes, and collegiate degree-awarding bodies.",
    badge: "Universities",
    color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Affiliated By / Certifications",
    url: "/admin/content/certifications",
    icon: BadgeCheck,
    description: "Certification providers, university affiliations, and accreditation authorities.",
    badge: "Certifications",
    color: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Subjects",
    url: "/admin/content/subjects",
    icon: GraduationCap,
    description: "Course subjects mapped to categories and examination boards with syllabus structures.",
    badge: "Curriculum",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Courses & Programs",
    url: "/admin/content/courses",
    icon: BookCheck,
    description: "Standardized programs, degrees, diplomas, and competitive exam tracks.",
    badge: "Catalog",
    color: "from-teal-500/10 to-emerald-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
  },
  {
    title: "Syllabus",
    url: "/admin/content/syllabus",
    icon: BookOpen,
    description: "Structured syllabus templates, units, chapters, topics, and learning outcomes.",
    badge: "Syllabus",
    color: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    title: "Assignments",
    url: "/admin/content/assignments",
    icon: ClipboardList,
    description: "Curriculum assignment templates with objective and subjective questions.",
    badge: "Assignments",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Practice Exams",
    url: "/admin/content/practice-exams",
    icon: ClipboardCheck,
    description: "Mock exams and topic assessments with instant automated grading and reviews.",
    badge: "Assessments",
    color: "from-emerald-500/10 to-cyan-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Exams",
    url: "/admin/content/exams",
    icon: FileText,
    description: "Standardized examination question papers, series schedules, and formats.",
    badge: "Exams",
    color: "from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Notes",
    url: "/admin/content/notes",
    icon: StickyNote,
    description: "Study material, lecture summaries, revision documents, and digital notes.",
    badge: "Study Notes",
    color: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  {
    title: "Blog",
    url: "/admin/content/blog",
    icon: FileText,
    description: "Publish educational blogs, guides, career insights, and announcements.",
    badge: "Articles",
    color: "from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
  },
  {
    title: "Skills",
    url: "/admin/master-data/skills",
    icon: BookOpen,
    description: "Manage global and subject-specific skill tags for staff and curriculum.",
    badge: "Core",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Designations",
    url: "/admin/master-data/designations",
    icon: UserCog,
    description: "Define staff job titles, hierarchy levels, and organization designations.",
    badge: "Staff",
    color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Locations",
    url: "/admin/master-data/locations",
    icon: MapPin,
    description: "Manage geographical branches, cities, states, and pin coordinates.",
    badge: "Geo",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Card Categories",
    url: "/admin/master-data/card-categories",
    icon: LibraryBig,
    description: "Classify ID cards, certificate badges, and member card types.",
    badge: "Identity",
    color: "from-rose-500/10 to-red-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  {
    title: "Card Templates",
    url: "/admin/master-data/card-templates",
    icon: IdCard,
    description: "Design and manage student & staff identity card print layouts.",
    badge: "Print",
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Default Calendar",
    url: "/admin/master-data/default-calendar",
    icon: CalendarDays,
    description: "Set nationwide holidays, standard term dates, and global events.",
    badge: "Schedule",
    color: "from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
  },
  {
    title: "Institution Types",
    url: "/admin/institutions/types",
    icon: Building2,
    description: "Primary institution classifications (Schools, Colleges, Universities, Coaching Centers).",
    badge: "Types",
    color: "from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Institution Subtypes",
    url: "/admin/institutions/subtypes",
    icon: Building2,
    description: "Specialized subtype classifications under primary institution categories.",
    badge: "Subtypes",
    color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Program Types",
    url: "/admin/institutions/program-types",
    icon: BookOpen,
    description: "Classification of educational offerings (Degree, Diploma, Certificate, School Level).",
    badge: "Programs",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Facility Types",
    url: "/admin/institutions/facility-types",
    icon: Building2,
    description: "Campus amenity and infrastructure categories (Labs, Libraries, Hostels, Sports).",
    badge: "Facilities",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Languages",
    url: "/admin/institutions/languages",
    icon: BookOpen,
    description: "Mediums of instruction and languages supported across curricula and campuses.",
    badge: "Languages",
    color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Academic Sessions",
    url: "/admin/institutions/academic-years",
    icon: CalendarDays,
    description: "Annual academic calendars, intake batches, and academic session durations.",
    badge: "Sessions",
    color: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
];

const INSTITUTION_MODULE_URLS = new Set([
  "/admin/content/assignments",
  "/admin/content/practice-exams",
  "/admin/content/exams",
  "/admin/content/notes",
  "/admin/content/blog",
  "/admin/master-data/card-templates",
  "/admin/master-data/card-categories",
]);

const INSTITUTION_TIMETABLE_MODULE = {
  title: "Timetable Setup",
  url: "/admin/master-data/timetable-setup",
  icon: CalendarDays,
  description: "Student class timetables, period bell schedules, and class teacher mappings for staff.",
  badge: "For Student / Staff",
  color: "from-indigo-500/10 to-violet-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
};

const INSTITUTION_ATTENDANCE_MODULE = {
  title: "Attendance Setup",
  url: "/admin/master-data/attendance-setup",
  icon: ClipboardCheck,
  description: "Configure biometric shifts, daily working hours, and leave policies for students and staff.",
  badge: "For Student / Staff",
  color: "from-rose-500/10 to-orange-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
};

const INSTITUTION_CALENDAR_MODULE = {
  title: "Institute Calendar",
  url: "/admin/master-data/institute-calendar",
  icon: CalendarDays,
  description: "Campus holidays, notices, and events with options to create for students and for staff.",
  badge: "For Student / Staff",
  color: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
};

export default function MasterDataPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const isInstitutionAdmin = Boolean(user?.role_codes?.includes("institution_admin") && !isPlatformAdmin);

  const visibleModules = isInstitutionAdmin
    ? [
        ...MASTER_DATA_MODULES.filter((m) => INSTITUTION_MODULE_URLS.has(m.url)),
        INSTITUTION_CALENDAR_MODULE,
        INSTITUTION_TIMETABLE_MODULE,
        INSTITUTION_ATTENDANCE_MODULE,
      ]
    : MASTER_DATA_MODULES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Briefcase className="size-4" />
            {isInstitutionAdmin ? "Campus Operations" : "System Architecture"}
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            {isInstitutionAdmin ? "Campus Master Hub" : "Master Data Hub"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            {isInstitutionAdmin
              ? "Configure campus assignments, exams, practice tests, study notes, institute calendar, timetables, and attendance policies."
              : "Configure system-wide parameters, curriculum standards, calendars, identity cards, and operational definitions."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 gap-1.5 px-3 font-semibold text-xs border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="size-3.5 text-primary" />
            {visibleModules.length} Master Modules Active
          </Badge>
        </div>
      </div>

      {/* Grid of Master Modules */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          const href = toRoleRoutePath(module.url, user);

          return (
            <Link key={module.url} href={href} className="group block focus:outline-hidden">
              <Card className="h-full border border-border/80 bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-md hover:border-primary/40 flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${module.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {module.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex items-center text-xs font-semibold text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage Module</span>
                    <ArrowRight className="size-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
