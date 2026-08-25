"use client";

import Link from "next/link";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import {
  FolderTree,
  Edit2,
  BookOpen,
  BookCheck,
  Building2,
  BadgeCheck,
  GraduationCap,
  FileText,
  IdCard,
  Image,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const INSTITUTION_EXCLUDED_HREFS = new Set([
  "/admin/content/tree",
  "/admin/content/categories",
  "/admin/content/boards",
  "/admin/content/universities",
  "/admin/content/certifications",
  "/admin/content/subjects",
  "/admin/content/courses",
  "/admin/content/syllabus",
]);

const CONTENT_MODULES = [
  {
    title: "Category Tree",
    description: "Multi-level taxonomic hierarchy for courses, departments, streams, and specializations.",
    href: "/admin/content/tree",
    icon: FolderTree,
    badge: "Hierarchy",
    color: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    title: "Manage Categories",
    description: "Create, rename, re-parent, and map categories directly to academic boards.",
    href: "/admin/content/categories",
    icon: Edit2,
    badge: "Taxonomy",
    color: "from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
  {
    title: "Boards",
    description: "Educational boards, university councils, and state/central examination authorities.",
    href: "/admin/content/boards",
    icon: BookOpen,
    badge: "Boards Master",
    color: "from-violet-500/20 to-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    title: "Universities",
    description: "Accredited universities, deemed institutes, and degree-awarding collegiate bodies.",
    href: "/admin/content/universities",
    icon: Building2,
    badge: "Universities",
    color: "from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    title: "Affiliated By / Certifications",
    description: "Certification providers, university affiliations, accreditation agencies, and industry partners.",
    href: "/admin/content/certifications",
    icon: BadgeCheck,
    badge: "Certifications",
    color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    title: "Subjects",
    description: "Course subjects mapped to categories and examination boards with syllabus structures.",
    href: "/admin/content/subjects",
    icon: GraduationCap,
    badge: "Curriculum",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    title: "Courses & Programs",
    description: "Standardized programs, degrees, diplomas, and competitive exam tracks mapped to boards or universities.",
    href: "/admin/content/courses",
    icon: BookCheck,
    badge: "Catalog",
    color: "from-teal-500/20 to-emerald-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30",
  },
  {
    title: "Syllabus",
    description: "Structured syllabus templates, units, chapters, topics, and learning outcome breakdowns.",
    href: "/admin/content/syllabus",
    icon: BookOpen,
    badge: "Syllabus Master",
    color: "from-fuchsia-500/20 to-pink-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  },
  {
    title: "Card Templates",
    description: "Design and customize student ID cards, certificates, hall tickets, and document templates.",
    href: "/admin/content/card-templates",
    icon: IdCard,
    badge: "Templates",
    color: "from-violet-500/20 to-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
  {
    title: "Assignments",
    description: "Curriculum assignment templates with objective & subjective questions and rubrics.",
    href: "/admin/content/assignments",
    icon: FileText,
    badge: "Assignments",
    color: "from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    title: "Practice Exams",
    description: "Mock exams and topic practice assessments with instant grading and explanations.",
    href: "/admin/content/practice-exams",
    icon: BookCheck,
    badge: "Mock Tests",
    color: "from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    title: "Exams",
    description: "Formal examination papers, series schedules, and multi-subject question papers.",
    href: "/admin/content/exams",
    icon: FileText,
    badge: "Exam Papers",
    color: "from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
  {
    title: "Study Notes",
    description: "Rich study material, chapter summaries, lecture notes, and downloadable guides.",
    href: "/admin/content/notes",
    icon: BookOpen,
    badge: "Notes",
    color: "from-rose-500/20 to-pink-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  {
    title: "Blog & Articles",
    description: "Manage informational guides, career advice, institute spotlights, and announcement blogs.",
    href: "/admin/content/blog",
    icon: FileText,
    badge: "Editorial",
    color: "from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  {
    title: "Media Library",
    description: "Centralized media assets, badges, institution banners, brochures, and video galleries.",
    href: "/admin/content/media",
    icon: Image,
    badge: "Assets",
    color: "from-pink-500/20 to-rose-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30",
  },
];

export default function ContentHubPage() {
  const { user } = useAuthStore();
  const isInstitutionAdmin = isInstitutionAdminUser(user) && !isPlatformAdminUser(user);
  const visibleModules = isInstitutionAdmin
    ? CONTENT_MODULES.filter((mod) => !INSTITUTION_EXCLUDED_HREFS.has(mod.href))
    : CONTENT_MODULES;

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-background to-muted/40 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Content Management Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isInstitutionAdmin ? "Campus Content & Curriculum" : "Content & Master Curriculum"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {isInstitutionAdmin
                ? "Manage curriculum assignments, question banks, practice exams, exams, campus notes, blog articles, and media."
                : "Configure course classification trees, educational boards, university affiliations, certification authorities, and subject taxonomies across EduBird."}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Content Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group">
              <Card className="h-full border border-border/80 hover:border-primary/50 transition-all duration-200 hover:shadow-md bg-card/60 hover:bg-card">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center font-bold border shadow-xs`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-xs font-medium bg-muted/30">
                        {mod.badge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                    <span>Manage {mod.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
